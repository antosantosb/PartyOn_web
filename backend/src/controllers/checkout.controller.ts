/**
 * checkout.controller.ts
 * ----------------------
 * Handles the two-step Stripe payment flow:
 *
 *   Step 1  POST /api/create-payment-intent
 *           → Frontend calls this BEFORE showing the card form.
 *           → Returns a `clientSecret` that the Stripe SDK uses to render
 *             the PaymentElement and collect card details securely.
 *
 *   Step 2  POST /api/checkout
 *           → Frontend calls this AFTER Stripe confirms the payment on its side.
 *           → We re-verify the payment with Stripe (never trust the client),
 *             then atomically decrement stock and issue tickets in the DB.
 *
 * WHY TWO STEPS?
 * Stripe's PaymentElement works with a concept called a PaymentIntent — a
 * server-side object that represents "an intention to collect money". The
 * frontend needs the PaymentIntent's `clientSecret` to render the card form.
 * Only after the card form confirms the payment (client-side) do we finalise
 * the order in our own database. This separation means card data NEVER touches
 * our server — Stripe handles PCI compliance entirely.
 */

import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * WHY IMPORT FROM stripe.service?
 * Previously, this file created its own `new Stripe(...)` instance inline.
 * Now we import the validated singleton from stripe.service.ts, which:
 *   1. Ensures the key is validated at startup (not silently undefined).
 *   2. Keeps Stripe configuration in one place.
 *   3. Prevents multiple SDK instances from competing for HTTP connections.
 */
import { stripe } from '../services/stripe.service';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Create a PaymentIntent and return its clientSecret to the frontend
// ─────────────────────────────────────────────────────────────────────────────

export const createPaymentIntent = async (req: Request, res: Response) => {
  const { ticketId, quantity } = req.body;

  // Basic input validation — never trust client-supplied data
  if (!ticketId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    // Fetch the ticket type to get the correct price (never trust client price)
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketId } });
    if (!ticketType) return res.status(404).json({ error: 'Tipo de entrada no encontrado' });

    // Soft stock check — full atomic check happens in processCheckout transaction
    if (ticketType.stock < quantity) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    // Stripe amounts are always in the smallest currency unit (cents for EUR)
    const amountInCents = Math.round(ticketType.price * quantity * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',

      /**
       * WHY `automatic_payment_methods`?
       * When using Stripe's PaymentElement (the modern multi-method UI), the
       * PaymentIntent MUST declare how payment methods are handled. Setting
       * `automatic_payment_methods: { enabled: true }` delegates this decision
       * to your Stripe Dashboard settings (you can toggle card, SEPA, etc.
       * there without code changes). Without this field, the PaymentElement
       * will fail to confirm the payment and throw:
       *   "This PaymentIntent's payment_method_types is not compatible..."
       */
      automatic_payment_methods: { enabled: true },

      // Metadata is stored on the Stripe PaymentIntent for reconciliation
      // (visible in the Stripe Dashboard and webhooks)
      metadata: {
        ticketId,
        quantity: String(quantity),
        ticketName: ticketType.name,
      },

      description: `PartyOn — ${ticketType.name} x${quantity}`,
    });

    // Return ONLY the clientSecret — never expose the full PaymentIntent object
    // to the client, as it contains sensitive server-side data.
    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    // Stripe errors have a `.type` field — log it to help diagnose auth vs network issues
    console.error('[createPaymentIntent] Stripe error:', {
      type: error?.type,      // e.g. 'StripeAuthenticationError' → key is wrong
      code: error?.code,      // e.g. 'api_key_expired'
      message: error?.message
    });
    res.status(500).json({ error: 'No se pudo crear el pago' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Verify payment, decrement stock, issue tickets
// ─────────────────────────────────────────────────────────────────────────────

export const processCheckout = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, ticketId, quantity, paymentIntentId } = req.body;

  // Validate required fields
  if (!buyerName || !buyerEmail || !ticketId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Datos de compra incompletos' });
  }

  // ─── CRITICAL: Re-verify payment server-side ───────────────────────────────
  // The frontend sends us the paymentIntentId after Stripe confirms the payment.
  // We MUST verify this with Stripe ourselves — we cannot simply trust the
  // client. A malicious user could send any paymentIntentId and claim it
  // succeeded. Retrieving it from Stripe and checking `pi.status === 'succeeded'`
  // is the authoritative verification.
  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.status !== 'succeeded') {
        // Payment was attempted but not completed (e.g. card declined, 3DS pending)
        return res.status(402).json({ error: 'El pago no se ha completado' });
      }

      // Extra guard: ensure this PaymentIntent was created for THIS ticket
      // (prevents reusing a PaymentIntent from a different order)
      if (pi.metadata?.ticketId && pi.metadata.ticketId !== ticketId) {
        return res.status(400).json({ error: 'El pago no corresponde a esta entrada' });
      }

    } catch (error: any) {
      console.error('[processCheckout] Stripe verification error:', {
        type: error?.type,
        code: error?.code,
        message: error?.message
      });
      return res.status(400).json({ error: 'No se pudo verificar el pago con Stripe' });
    }
  }

  try {
    /**
     * WHY A TRANSACTION?
     * Without a transaction, two concurrent purchases could both pass the
     * stock check (both see stock = 1), both decrement stock (now -1), and
     * both issue tickets — a classic race condition. Wrapping everything in
     * `prisma.$transaction` ensures these operations are atomic: they all
     * succeed together or all fail together (ACID guarantee).
     */
    const tickets = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction for a fresh, locked view of stock
      const ticketType = await tx.ticketType.findUnique({ where: { id: ticketId } });

      if (!ticketType) throw new Error('Tipo de entrada no encontrado');

      // Final authoritative stock check (inside the transaction)
      if (ticketType.stock < quantity) throw new Error('Stock insuficiente');

      // Atomically subtract the purchased quantity from stock
      await tx.ticketType.update({
        where: { id: ticketId },
        data: { stock: { decrement: quantity } }
      });

      // Create one Ticket row per seat purchased (not one row for quantity=N)
      // This allows individual QR codes per ticket in Phase 2
      const created = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            eventId: ticketType.eventId,
            ticketTypeId: ticketId,
            name: buyerName,
            email: buyerEmail,
            status: 'VALID',
            // Store the Stripe PaymentIntent ID for reconciliation / refunds
            paymentIntent: paymentIntentId ?? null,
          }
        });
        created.push(ticket);
      }

      return created;
    });

    // TODO Phase 2: Send one email per ticket with a unique QR code via Resend

    res.json({
      success: true,
      message: 'Entradas generadas con éxito',
      tickets,
    });

  } catch (error: any) {
    // Surface domain errors (stock, not found) as 400 instead of 500
    if (['Stock insuficiente', 'Tipo de entrada no encontrado'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('[processCheckout] DB error:', error);
    res.status(500).json({ error: 'Error al procesar la compra' });
  }
};
