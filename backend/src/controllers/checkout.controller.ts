import { Request, Response } from 'express';
import { prisma } from '../index';

export const processCheckout = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, buyerPhone, ticketId, quantity } = req.body;

  if (!buyerName || !buyerEmail || !ticketId || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Datos de compra incompletos" });
  }

  try {
    // Atomic transaction: check stock AND decrement AND create tickets in one DB operation
    // This prevents race conditions / overselling when two requests arrive simultaneously
    const tickets = await prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findUnique({
        where: { id: ticketId }
      });

      if (!ticketType) {
        throw new Error("Tipo de entrada no encontrado");
      }
      if (ticketType.stock < quantity) {
        throw new Error("Stock insuficiente");
      }

      // Decrement stock
      await tx.ticketType.update({
        where: { id: ticketId },
        data: { stock: { decrement: quantity } }
      });

      // Create one Ticket record per unit purchased
      const created = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            eventId: ticketType.eventId,
            ticketTypeId: ticketId,
            name: buyerName,
            email: buyerEmail,
            status: 'VALID'
          }
        });
        created.push(ticket);
      }

      return created;
    });

    // TODO Phase 2: trigger Stripe payment + Resend email with QR here

    res.json({ success: true, message: "Entradas generadas con éxito", tickets });
  } catch (error: any) {
    if (error.message === "Stock insuficiente" || error.message === "Tipo de entrada no encontrado") {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "Error al procesar la compra" });
  }
};
