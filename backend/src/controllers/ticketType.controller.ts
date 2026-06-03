import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { prisma } from '../index';

interface TicketTypeInput {
  id?: string;
  name: string;
  price: number;
  maxStock: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  forceSoldOut?: boolean;
}

function parseDatetimeLocal(value?: string | null): Date | null {
  if (!value || value.trim() === '') return null;
  
  try {
    // The string from <input type="datetime-local"> is timezone-naive (YYYY-MM-DDTHH:mm).
    // We explicitly treat it as Europe/Lisbon to get the correct UTC offset for the DB.
    const date = fromZonedTime(value, 'Europe/Lisbon');
    
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (err) {
    console.error(`[parseDatetimeLocal] Failed to parse: ${value}`, err);
    return null;
  }
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
        const record = await tx.ticketType.upsert({
          where: { id: tt.id || 'new-unsaved-type' },
          create: {
            eventId,
            name: tt.name.trim(),
            price: parseFloat(String(tt.price)),
            maxStock: Math.max(0, Math.round(tt.maxStock)),
            saleStartsAt: parseDatetimeLocal(tt.saleStartsAt),
            saleEndsAt: parseDatetimeLocal(tt.saleEndsAt),
            forceSoldOut: tt.forceSoldOut ?? false,
          },
          update: {
            name: tt.name.trim(),
            price: parseFloat(String(tt.price)),
            maxStock: Math.max(0, Math.round(tt.maxStock)),
            saleStartsAt: parseDatetimeLocal(tt.saleStartsAt),
            saleEndsAt: parseDatetimeLocal(tt.saleEndsAt),
            forceSoldOut: tt.forceSoldOut ?? false,
          }
        });
        updated.push(record);
        incomingIds.push(record.id);
      }

      // Handle deletions: types removed from the UI
      const existingTypes = await tx.ticketType.findMany({
        where: { eventId, isArchived: false }
      });

      for (const existing of existingTypes) {
        if (!incomingIds.includes(existing.id)) {
          if (existing.isDoorType) {
            throw new Error("O bilhete de porta é obrigatório e não pode ser eliminado.");
          }
          const soldCount = await tx.ticket.count({
            where: { ticketTypeId: existing.id }
          });
          if (soldCount === 0) {
            // Hard delete — no tickets sold
            await tx.ticketType.delete({ where: { id: existing.id } });
          } else {
            // Soft delete — archive to preserve ticket references
            await tx.ticketType.update({
              where: { id: existing.id },
              data: { isArchived: true }
            });
          }
        }
      }

      return updated;
    });

    res.json({ success: true, ticketTypes: result });
  } catch (error: any) {
    console.error("[updateTicketTypes] Error details:", error);

    if (error.message === "O bilhete de porta é obrigatório e não pode ser eliminado.") {
      return res.status(403).json({ error: error.message });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        error: "Database error during ticket type update",
        code: error.code,
        message: error.message
      });
    }

    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ 
      error: 'Error al actualizar los tipos de entrada',
      message: error.message,
      stack: isDev ? error.stack : undefined
    });
  }
};
