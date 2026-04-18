import { Request, Response } from 'express';
import { prisma } from '../index';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

// Step 1: Frontend calls this to get a client_secret before showing the card form
export const createPaymentIntent = async (req: Request, res: Response) => {
  const { ticketId, quantity } = req.body;

  if (!ticketId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketId } });
    if (!ticketType) return res.status(404).json({ error: 'Tipo de entrada no encontrado' });
    if (ticketType.stock < quantity) return res.status(400).json({ error: 'Stock insuficiente' });

    const amountInCents = Math.round(ticketType.price * quantity * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      metadata: { ticketId, quantity: String(quantity) },
      description: `PartyOn — ${ticketType.name} x${quantity}`
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear el pago' });
  }
};

// Step 2: Frontend calls this AFTER Stripe confirms the payment
export const processCheckout = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, buyerPhone, ticketId, quantity, paymentIntentId } = req.body;

  if (!buyerName || !buyerEmail || !ticketId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Datos de compra incompletos' });
  }

  // Verify the Stripe payment was actually successful before issuing tickets
  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== 'succeeded') {
        return res.status(402).json({ error: 'El pago no se ha completado' });
      }
    } catch {
      return res.status(400).json({ error: 'No se pudo verificar el pago con Stripe' });
    }
  }

  try {
    // Atomic transaction: stock check + decrement + ticket creation
    const tickets = await prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findUnique({ where: { id: ticketId } });

      if (!ticketType) throw new Error('Tipo de entrada no encontrado');
      if (ticketType.stock < quantity) throw new Error('Stock insuficiente');

      await tx.ticketType.update({
        where: { id: ticketId },
        data: { stock: { decrement: quantity } }
      });

      const created = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            eventId: ticketType.eventId,
            ticketTypeId: ticketId,
            name: buyerName,
            email: buyerEmail,
            status: 'VALID',
            paymentIntent: paymentIntentId ?? null
          }
        });
        created.push(ticket);
      }

      return created;
    });

    // TODO Phase 2: Send Resend email with QR code for each ticket

    res.json({ success: true, message: 'Entradas generadas con éxito', tickets });
  } catch (error: any) {
    if (['Stock insuficiente', 'Tipo de entrada no encontrado'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la compra' });
  }
};
