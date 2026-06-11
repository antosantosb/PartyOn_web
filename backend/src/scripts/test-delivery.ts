import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { generateTicketQR } from '../services/qr.service';
import { generateTicketPDF } from '../services/pdf.service';
import { sendTicketEmail } from '../services/email.service';

/**
 * test-delivery.ts
 * ----------------
 * Mock script to verify the QR -> PDF -> Email pipeline.
 * Run with: npx tsx src/scripts/test-delivery.ts
 */
async function testDelivery() {
  console.log('🚀 Starting Ticket Delivery Test...');

  try {
    // 1. Get an existing event and ticket type
    const event = await prisma.event.findFirst({
      include: { theme: true, ticketTypes: true }
    });

    if (!event) {
      console.error('❌ No event found in DB. Please run the server once to seed.');
      return;
    }

    const theme = event.theme || { primaryColor: '#00ffcc' };
    const ticketType = event.ticketTypes[0];

    // 2. Mock a ticket object
    const mockTicket = {
      id: 'test_ticket_id_' + Date.now(),
      name: 'Test Buyer',
      email: 'antoniodsantos05@gmail.com', // Replace with your test email if needed
      ticketType: ticketType
    };

    console.log(`📦 Mocking delivery for: ${event.name}`);

    // Step A: QR
    console.log('  -> Generating QR...');
    const qrBase64 = await generateTicketQR(mockTicket.id, theme.primaryColor);

    // Step B: PDF
    console.log('  -> Generating PDF Card...');
    const pdfBuffer = await generateTicketPDF({
      event: {
        name: event.name,
        tagline: event.tagline ?? undefined,
        date: event.date,
        location: event.location,
      },
      theme: {
        primaryColor: theme.primaryColor ?? undefined,
        backgroundImage: (theme as any).backgroundImage || "/hero.jpg",
      },
      ticket: {
        id: mockTicket.id,
        name: mockTicket.name,
        ticketType: { name: ticketType.name },
      },
      qrCodeBase64: qrBase64
    });

    // Step C: Email
    console.log(`  -> Sending Consolidated Email to: ${mockTicket.email}...`);
    const result = await sendTicketEmail({
      to: mockTicket.email,
      subject: event.emailSubject || 'Your Ticket',
      bodyMarkdown: event.emailBody || 'Here is your ticket!',
      eventName: event.name,
      tickets: [
        { pdfBuffer, ticketId: mockTicket.id }
      ]
    });

    console.log('✅ Test Complete! Result:', result);

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDelivery();
