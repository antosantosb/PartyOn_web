import { Request, Response } from 'express';
import { prisma } from '../index';

export const processCheckout = async (req: Request, res: Response) => {
  try {
    const { buyerName, buyerEmail, buyerPhone, ticketId, quantity } = req.body;

    // 1. Verify that the ticket exists and has enough stock
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketId }
    });

    if (!ticketType || ticketType.stock < quantity) {
      return res.status(400).json({ error: "No hay suficiente stock para este ticket" });
    }

    // 2. Reduce stock transactionally 
    await prisma.ticketType.update({
      where: { id: ticketId },
      data: {
         stock: { decrement: quantity }
      }
    });

    // 3. Create Ticket(s) in Db
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
        const ticket = await prisma.ticket.create({
            data: {
               eventId: ticketType.eventId,
               ticketTypeId: ticketId,
               name: buyerName,
               email: buyerEmail, 
               status: 'VALID'
            }
        });
        tickets.push(ticket);
    }

    // 4. Ideally calling Stripe and Resend (QR) goes here. 
    // They are mocked for now to focus on the structure.

    res.json({ success: true, message: "Entradas generadas con éxito", tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process checkout" });
  }
};
