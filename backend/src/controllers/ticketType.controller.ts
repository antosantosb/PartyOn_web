import { Request, Response } from 'express';
import { prisma } from '../index';

interface TicketTypeInput {
  id?: string;
  name: string;
  price: number;
  stock: number;
}

export const updateTicketTypes = async (req: Request, res: Response) => {
  const { eventId, ticketTypes } = req.body as {
    eventId: string;
    ticketTypes: TicketTypeInput[];
  };

  if (!eventId || !Array.isArray(ticketTypes)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    // Run everything in a transaction so the DB never ends up in a partial state
    const result = await prisma.$transaction(async (tx) => {
      const updated: any[] = [];
      const incomingIds: string[] = [];

      for (const tt of ticketTypes) {
        const soldCount = tt.id ? await tx.ticket.count({
          where: { ticketTypeId: tt.id, status: 'VALID' }
        }) : 0;
        
        const safeStock = Math.max(Math.round(tt.stock), soldCount);
        
        const record = await tx.ticketType.upsert({
          where: { id: tt.id || 'new-unsaved-type' },
          create: {
            eventId,
            name: tt.name.trim(),
            price: parseFloat(String(tt.price)),
            stock: Math.max(0, Math.round(tt.stock))
          },
          update: {
            name: tt.name.trim(),
            price: parseFloat(String(tt.price)),
            stock: safeStock
          }
        });
        updated.push(record);
        incomingIds.push(record.id);
      }

      // Remove types that were deleted in the UI — only if they have zero sold tickets
      const existingTypes = await tx.ticketType.findMany({
        where: { eventId },
        select: { id: true }
      });

      for (const existing of existingTypes) {
        if (!incomingIds.includes(existing.id)) {
          const soldCount = await tx.ticket.count({
            where: { ticketTypeId: existing.id, status: 'VALID' }
          });
          if (soldCount === 0) {
            await tx.ticketType.delete({ where: { id: existing.id } });
          }
          // If there are sold tickets, silently keep the type (can't orphan sold tickets)
        }
      }

      return updated;
    });

    res.json({ success: true, ticketTypes: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar los tipos de entrada' });
  }
};
