import { Request, Response } from 'express';
import { prisma } from '../index';

export const getStoreData = async (req: Request, res: Response) => {
  try {
    let event = await prisma.event.findFirst({
      where: { status: 'ACTIVE' },
      include: { ticketTypes: true, theme: true }
    });

    if (!event) {
      // Seed default event on first run
      event = await prisma.event.create({
        data: {
          name: "EL PERREO INTENSO",
          status: "ACTIVE",
          tagline: "La noche que no olvidarás",
          date: "SÁBADO 15 NOVIEMBRE",
          location: "BRAGA",
          lineup: "DJ Álvaro, MC Regueton, La Reina Latina",
          logoText1: "PARTY",
          logoText2: "ON",
          ticketTypes: {
            create: [
              { name: 'General', price: 15, stock: 150 },
              { name: 'VIP', price: 30, stock: 0 }
            ]
          },
          theme: {
            create: {
              primaryColor: "#00ffcc",
              secondaryColor: "#ff007f",
              backgroundImage: "/hero.jpg"
            }
          }
        },
        include: { ticketTypes: true, theme: true }
      });
    }

    res.json({ eventData: event, theme: event.theme });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch event data" });
  }
};

export const updateStoreData = async (req: Request, res: Response) => {
  try {
    const { eventData, theme } = req.body;

    if (!eventData?.id) {
      return res.status(400).json({ error: "Missing event ID" });
    }

    // Enforce single ACTIVE event logic
    if (eventData.status === 'ACTIVE') {
      const activeEvent = await prisma.event.findFirst({
        where: { status: 'ACTIVE', id: { not: eventData.id } }
      });

      if (activeEvent) {
        if (!req.body.resolveConflict) {
          return res.status(409).json({
            error: "Conflict",
            activeEventName: activeEvent.name,
            activeEventId: activeEvent.id
          });
        } else {
          // Transition the previous active event to COMPLETED
          await prisma.event.update({
            where: { id: activeEvent.id },
            data: { status: 'COMPLETED' }
          });
        }
      }
    }

    // Update event — including new tagline & lineup fields
    await prisma.event.update({
      where: { id: eventData.id },
      data: {
        name: eventData.partyName || eventData.name,
        status: eventData.status || undefined,
        tagline: eventData.tagline ?? null,
        date: eventData.date,
        location: eventData.location,
        artistInfo: eventData.artistInfo,
        lineup: eventData.lineup ?? null,
        logoText1: eventData.logoText1,
        logoText2: eventData.logoText2,
        emailSubject: eventData.emailSubject,
        emailBody: eventData.emailBody,
      }
    });

    // Update Theme
    if (theme?.id) {
      await prisma.theme.update({
        where: { id: theme.id },
        data: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          backgroundImage: theme.backgroundImage
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update event data" });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { ticketTypes: true, theme: true }
    });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const newEvent = await prisma.event.create({
      data: {
        name: "NUEVA FIESTA",
        status: "DRAFT",
        date: "POR DEFINIR",
        location: "POR DEFINIR",
        logoText1: "NUEVA",
        logoText2: "FIESTA",
        theme: {
          create: {
            primaryColor: "#00ffcc",
            secondaryColor: "#ff007f",
            backgroundImage: ""
          }
        }
      },
      include: { ticketTypes: true, theme: true }
    });
    res.json({ event: newEvent });
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ error: "Missing event ID" });

    const event = await prisma.event.findUnique({
      where: { id },
      include: { tickets: true }
    });

    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.status !== 'DRAFT') {
      return res.status(400).json({ error: "Only DRAFT events can be deleted" });
    }

    if (event.tickets.length > 0) {
      return res.status(400).json({ error: "Cannot delete an event with sold tickets" });
    }

    await prisma.$transaction([
      prisma.theme.deleteMany({ where: { eventId: id } }),
      prisma.ticketType.deleteMany({ where: { eventId: id } }),
      prisma.expense.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id: id } })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

export const validateTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: "Missing ticketId" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    if (ticket.status === 'USED') {
      return res.status(400).json({ error: "Esta entrada YA HA SIDO USADA" });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: "Esta entrada está CANCELADA" });
    }

    // Update to USED
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'USED' }
    });

    res.json({
      success: true,
      message: "Acceso Permitido",
      ticket: {
        id: updated.id,
        name: updated.name,
        ticketTypeName: ticket.ticketType.name
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to validate ticket" });
  }
};
