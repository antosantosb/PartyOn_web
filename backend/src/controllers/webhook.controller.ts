import { Request, Response } from 'express';
import { prisma } from '../index';
import { stripe } from '../services/stripe.service';
import { generateTicketQR } from '../services/qr.service';
import { generateTicketPDF } from '../services/pdf.service';
import { sendTicketEmail } from '../services/email.service';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[Stripe Webhook] Missing stripe-signature or webhook secret configuration');
    return res.status(400).json({ error: 'Webhook Secret configuration error or signature missing' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event type: ${event.type}`);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const paymentIntentId = paymentIntent.id;

    const { eventId, ticketTypeId, quantity: quantityStr, buyerName, buyerEmail } = paymentIntent.metadata || {};

    if (!eventId || !ticketTypeId || !quantityStr || !buyerName || !buyerEmail) {
      console.warn(`[Stripe Webhook] PaymentIntent ${paymentIntentId} missing required metadata fields. Skipping fulfillment.`);
      return res.status(200).json({ received: true, status: 'ignored_missing_metadata' });
    }

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) {
      console.warn(`[Stripe Webhook] PaymentIntent ${paymentIntentId} metadata quantity is invalid (${quantityStr}). Skipping.`);
      return res.status(200).json({ received: true, status: 'ignored_invalid_quantity' });
    }

    try {
      // Idempotency check: see if Order already exists
      const existingOrder = await prisma.order.findUnique({
        where: { paymentIntent: paymentIntentId },
      });

      if (existingOrder) {
        console.log(`[Stripe Webhook] Order for PaymentIntent ${paymentIntentId} already fulfilled.`);
        return res.status(200).json({ received: true, status: 'already_fulfilled' });
      }

      console.log(`[Stripe Webhook] Fulfilling order for PaymentIntent ${paymentIntentId}...`);

      // Transactional fulfillment
      const { tickets, order } = await prisma.$transaction(async (tx) => {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: ticketTypeId },
        });

        if (!ticketType) {
          throw new Error('Tipo de entrada no encontrado');
        }

        if (ticketType.forceSoldOut || ticketType.isArchived) {
          throw new Error('Este tipo de entrada no está disponible');
        }

        const remaining = ticketType.maxStock - ticketType.soldCount;
        if (remaining < quantity) {
          throw new Error('Stock insuficiente');
        }

        // Atomically increment sold count
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: {
            soldCount: { increment: quantity },
          },
        });

        // Create Order
        const order = await tx.order.create({
          data: {
            eventId,
            customerName: buyerName,
            customerEmail: buyerEmail,
            totalPaid: ticketType.price * quantity,
            paymentIntent: paymentIntentId,
            status: 'COMPLETED',
          },
        });

        // Create Tickets
        const createdTickets = [];
        for (let i = 0; i < quantity; i++) {
          const ticket = await tx.ticket.create({
            data: {
              eventId,
              ticketTypeId,
              orderId: order.id,
              name: buyerName,
              email: buyerEmail,
              status: 'VALID',
              paymentIntent: paymentIntentId,
              pricePaid: ticketType.price,
            },
          });
          createdTickets.push(ticket);
        }

        return { tickets: createdTickets, order };
      });

      // Quick response to Stripe
      res.status(200).json({ received: true, orderId: order.id });

      // Delivery tickets in background
      (async () => {
        console.log(`[Stripe Webhook Delivery] Starting background ticket generation/email dispatch to ${buyerEmail}...`);
        try {
          const ticketTypeInfo = await prisma.ticketType.findUnique({
            where: { id: ticketTypeId },
            include: {
              event: {
                include: { theme: true },
              },
            },
          });

          if (!ticketTypeInfo || !ticketTypeInfo.event) {
            console.error('[Stripe Webhook Delivery] Could not fetch event or theme details.');
            return;
          }

          const { event } = ticketTypeInfo;
          const theme = event.theme || { primaryColor: '#00ffcc', backgroundImage: null, backgroundImageMobile: null };

          const collectedTickets: { pdfBuffer: Buffer; ticketId: string }[] = [];

          for (const ticket of tickets) {
            try {
              const qrBase64 = await generateTicketQR(ticket.id, theme.primaryColor);

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
                qrCodeBase64: qrBase64,
              });

              collectedTickets.push({ pdfBuffer, ticketId: ticket.id });
            } catch (err) {
              console.error(`[Stripe Webhook Delivery] Failed generating PDF for ${ticket.id}:`, err);
            }
          }

          if (collectedTickets.length > 0) {
            const emailResult = await sendTicketEmail({
              to: buyerEmail,
              subject: event.emailSubject,
              bodyMarkdown: event.emailBody,
              eventName: event.name,
              tickets: collectedTickets,
            });
            console.log(`[Stripe Webhook Delivery] Email dispatched. Message ID: ${emailResult.messageId}`);
          }
        } catch (systemError) {
          console.error('[Stripe Webhook Delivery] Background processing error:', systemError);
        }
      })();

      return;
    } catch (error: any) {
      console.error('[Stripe Webhook] DB error or validation error:', error);
      // Log to DB audit log
      await prisma.auditLog.create({
        data: {
          severity: 'CRITICAL',
          action: 'STRIPE_WEBHOOK_FULFILLMENT_ERROR',
          details: `PaymentIntent: ${paymentIntentId}, Error: ${error.message || error}`,
        },
      });

      return res.status(500).json({ error: 'Fulfillment process failed' });
    }
  }

  // Return 200 for unhandled events
  res.status(200).json({ received: true });
};
