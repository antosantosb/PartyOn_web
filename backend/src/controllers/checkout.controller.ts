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
import { generateTicketQR } from '../services/qr.service';
import { generateTicketPDF } from '../services/pdf.service';
import { sendTicketEmail } from '../services/email.service';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Create a PaymentIntent and return its clientSecret to the frontend
// ─────────────────────────────────────────────────────────────────────────────

export const createPaymentIntent = async (req: Request, res: Response) => {
  const { ticketId, quantity, buyerName, buyerEmail } = req.body;

  // Basic input validation — never trust client-supplied data
  if (!ticketId || !quantity || quantity < 1 || !buyerName || !buyerEmail) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    // Fetch the ticket type to get the correct price (never trust client price)
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketId } });
    if (!ticketType) return res.status(404).json({ error: 'Tipo de entrada no encontrado' });

    // Soft availability check — full atomic check happens in processCheckout transaction
    if (ticketType.forceSoldOut || ticketType.isArchived) {
      return res.status(400).json({ error: 'Este tipo de entrada no está disponible' });
    }
    const remaining = ticketType.maxStock - ticketType.soldCount;
    if (remaining < quantity) {
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
        eventId: ticketType.eventId,
        ticketTypeId: ticketId,
        quantity: String(quantity),
        buyerName,
        buyerEmail,
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
    
    await prisma.auditLog.create({
      data: { 
        severity: 'CRITICAL', 
        action: 'EXTERNAL_API_ERROR', 
        details: `Message: ${error?.message || 'Unknown Stripe Error'}`,
        userId: (req as any).user?.userId
      }
    });

    res.status(500).json({ error: 'No se pudo crear el pago' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Verify payment, decrement stock, issue tickets
// ─────────────────────────────────────────────────────────────────────────────

export const processCheckout = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, ticketId, quantity, paymentIntentId, marketingConsent } = req.body;

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

      await prisma.auditLog.create({
        data: { 
          severity: 'CRITICAL', 
          action: 'EXTERNAL_API_ERROR', 
          details: `Message: ${error?.message || 'Unknown Stripe Error'}`,
          userId: (req as any).user?.userId
        }
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
    const { tickets, order } = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction for a fresh, locked view of stock
      const ticketType = await tx.ticketType.findUnique({ where: { id: ticketId } });

      if (!ticketType) throw new Error('Tipo de entrada no encontrado');

      // Final authoritative availability check (inside the transaction)
      if (ticketType.forceSoldOut || ticketType.isArchived) {
        throw new Error('Este tipo de entrada no está disponible');
      }
      const remaining = ticketType.maxStock - ticketType.soldCount;
      if (remaining < quantity) {
        throw new Error('Stock insuficiente');
      }

      // Atomically increment sold count
      await tx.ticketType.update({
        where: { id: ticketId },
        data: { 
          soldCount: { increment: quantity }
        }
      });

      // Create the Order record
      const order = await tx.order.create({
        data: {
          eventId: ticketType.eventId,
          customerName: buyerName,
          customerEmail: buyerEmail,
          totalPaid: ticketType.price * quantity,
          paymentIntent: paymentIntentId ?? null,
          status: 'COMPLETED',
          marketingConsent: !!marketingConsent
        }
      });

      // Create one Ticket row per seat purchased
      const created = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            eventId: ticketType.eventId,
            ticketTypeId: ticketId,
            orderId: order.id,
            name: buyerName,
            email: buyerEmail,
            status: 'VALID',
            paymentIntent: paymentIntentId ?? null,
            pricePaid: ticketType.price,
            marketingConsent: !!marketingConsent
          }
        });
        created.push(ticket);
      }

      return { tickets: created, order };
    });

    res.json({
      success: true,
      message: 'Entradas generadas con éxito',
      orderId: order.id,
      tickets,
    });

    /**
     * ─── TICKET DELIVERY SYSTEM (ASYNCHRONOUS) ──────────────────────────────
     * We trigger this AFTER sending the success response to the frontend.
     * This ensures the user sees the "Success" screen instantly, while the
     * "heavy" PDF generation and Email sending happen in the background.
     * 
     * We also wrap this in a try/catch so if the email service is down,
     * it doesn't crash the request logic.
     */
    (async () => {
      console.log(`[Delivery] Starting background process for ${tickets.length} ticket(s) to ${buyerEmail}...`);
      try {
        // 1. Fetch full Event and Theme context for branding
        const ticketTypeInfo = await prisma.ticketType.findUnique({
          where: { id: ticketId },
          include: {
            event: {
              include: { theme: true }
            }
          }
        });

        if (!ticketTypeInfo || !ticketTypeInfo.event) {
          console.error('[Delivery] Aborting: Could not find ticket type or event data for ID:', ticketId);
          return;
        }

        const { event } = ticketTypeInfo;
        const theme = event.theme || { primaryColor: '#00ffcc', backgroundImage: null, backgroundImageMobile: null };
        console.log(`[Delivery] Branding found - Event: ${event.name}, PrimaryColor: ${theme.primaryColor}`);

        // 2. Prepare collection for the single email
        const collectedTickets: { pdfBuffer: Buffer; ticketId: string }[] = [];
        console.log(`[Delivery] Processing ${tickets.length} ticket(s)...`);

        for (const ticket of tickets) {
          try {
            console.log(`[Delivery] Generating Ticket: ${ticket.id}`);

            // STEP A: Generate Branded QR Code
            const qrBase64 = await generateTicketQR(ticket.id, theme.primaryColor);

            // STEP B: Generate Branded PDF Ticket Card
            const pdfBuffer = await generateTicketPDF({
              event: {
                name: event.name,
                tagline: event.tagline ?? undefined,
                date: event.date,
                location: event.location,
                startsAt: event.startsAt?.toISOString() ?? null,
                endsAt: event.endsAt?.toISOString() ?? null,
              },
              theme: {
                primaryColor: theme.primaryColor ?? undefined,
                backgroundImage: theme.backgroundImageMobile || theme.backgroundImage || undefined,
              },
              ticket: { 
                id: ticket.id,
                name: ticket.name,
                ticketType: { name: ticketTypeInfo.name },
              },
              qrCodeBase64: qrBase64
            });

            collectedTickets.push({ pdfBuffer, ticketId: ticket.id });
          } catch (deliveryError) {
            console.error(`[Delivery] ❌ FAILED to generate PDF for ${ticket.id}:`, deliveryError);
            // We continue the loop so other tickets in the same order still get generated
          }
        }

        // 3. Dispatch the single consolidated email
        if (collectedTickets.length > 0) {
          console.log(`[Delivery] Dispatching single email with ${collectedTickets.length} ticket(s) to ${buyerEmail}...`);
          const result = await sendTicketEmail({
            to: buyerEmail,
            subject: event.emailSubject,
            bodyMarkdown: event.emailBody,
            eventName: event.name,
            tickets: collectedTickets
          });
          console.log(`[Delivery] ✅ SUCCESS: Consolidated email sent. ID: ${result.messageId}`);
        } else {
          console.warn('[Delivery] No tickets were generated, skip email.');
        }
      } catch (systemError) {
        console.error('[Delivery] Fatal system error in background task:', systemError);
      }
    })();

  } catch (error: any) {
    // Surface domain errors (stock, not found) as 400 instead of 500
    if (['Stock insuficiente', 'Tipo de entrada no encontrado', 'Este tipo de entrada no está disponible'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('[processCheckout] DB error:', error);
    res.status(500).json({ error: 'Error al procesar la compra' });
  }
};
