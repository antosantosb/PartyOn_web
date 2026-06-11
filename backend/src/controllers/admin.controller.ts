import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { prisma } from '../index';
import { EventSchema } from '@partyon/schemas';

function parseDatetimeLocal(value?: string | null): Date | null {
  if (!value || value.trim() === '') return null;
  
  try {
    const date = fromZonedTime(value, 'Europe/Lisbon');
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (err) {
    console.error(`[parseDatetimeLocal] Failed to parse value: ${value}`, err);
    return null;
  }
}

export const getStoreData = async (req: Request, res: Response) => {
  try {
    let event = await prisma.event.findFirst({
      where: { isPublished: true },
      include: { ticketTypes: { where: { isArchived: false } }, theme: true }
    });

    if (!event) {
      // Seed default event if none is published or exists
      const existing = await prisma.event.findFirst({
        include: { ticketTypes: { where: { isArchived: false } }, theme: true }
      });
      
      if (existing) {
        event = existing;
      } else {
        event = await prisma.event.create({
          data: {
            name: "EL PERREO INTENSO",
            isPublished: true,
            tagline: "La noche que no olvidarás",
            date: "SÁBADO 15 NOVIEMBRE",
            location: "BRAGA",
            lineup: "DJ Álvaro, MC Regueton, La Reina Latina",
            logoText1: "PARTY",
            logoText2: "",
            ticketTypes: {
              create: [
                { name: 'General', price: 15, maxStock: 150 },
                { name: 'VIP', price: 30, maxStock: 0 },
                { name: 'Taquilla / En Puerta', price: 10, maxStock: 9999, isDoorType: true }
              ]
            },
            theme: {
              create: {
                primaryColor: "#e63329",
                secondaryColor: "",
                backgroundImage: "/hero.jpg"
              }
            }
          },
          include: { ticketTypes: true, theme: true }
        });
      }
    }

    res.json({ eventData: { ...event, status: event.isPublished ? 'ACTIVE' : 'DRAFT' }, theme: event.theme });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch event data" });
  }
};

export const getActiveEvent = async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findFirst({
      where: { isPublished: true },
      include: { 
        ticketTypes: { where: { isArchived: false } }, 
        theme: true,
        galleryImages: { orderBy: { order: 'asc' } }
      }
    });
    if (!event) {
      // Return any first event if no active event is explicitly published
      const fallback = await prisma.event.findFirst({
        include: { 
          ticketTypes: { where: { isArchived: false } }, 
          theme: true,
          galleryImages: { orderBy: { order: 'asc' } }
        }
      });
      return res.json({ event: fallback ? { ...fallback, status: fallback.isPublished ? 'ACTIVE' : 'DRAFT' } : null });
    }
    res.json({ event: { ...event, status: event.isPublished ? 'ACTIVE' : 'DRAFT' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch active event" });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  try {
    const validation = EventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Datos inválidos", details: validation.error.format() });
    }

    const data = validation.data;
    const parsedStartsAt = data.startsAt ? parseDatetimeLocal(data.startsAt) : null;
    const parsedEndsAt = data.endsAt ? parseDatetimeLocal(data.endsAt) : null;

    // Enforce single active published event
    if (data.isPublished) {
      await prisma.event.updateMany({
        where: { id: { not: id } },
        data: { isPublished: false }
      });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: data.name,
        isPublished: data.isPublished,
        tagline: data.tagline,
        date: data.date,
        startsAt: parsedStartsAt,
        endsAt: parsedEndsAt,
        location: data.location,
        lineup: data.lineup,
        tickerText: data.tickerText,
        manifesto: data.manifesto,
        manifestoLabel: data.manifestoLabel,
        ctaLabel: data.ctaLabel,
        logoText1: data.logoText1 || '',
        logoText2: '',
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        showGallery: data.showGallery,
        galleryTitle: data.galleryTitle,
        showNewsletter: data.showNewsletter,
        newsletterText: data.newsletterText,
        newsletterSubtext: data.newsletterSubtext
      }
    });

    res.json({ success: true, event: { ...updated, status: updated.isPublished ? 'ACTIVE' : 'DRAFT' } });
  } catch (error: any) {
    console.error("[updateEvent] Error:", error);
    res.status(500).json({ error: "Error al actualizar el evento" });
  }
};

export const updateEventTheme = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { primaryColor, backgroundImage, backgroundImageMobile } = req.body;

  try {
    const theme = await prisma.theme.upsert({
      where: { eventId: id },
      create: {
        eventId: id,
        primaryColor: primaryColor || "#e63329",
        secondaryColor: "",
        backgroundImage: backgroundImage || "",
        backgroundImageMobile: backgroundImageMobile || ""
      },
      update: {
        primaryColor,
        secondaryColor: "",
        backgroundImage,
        backgroundImageMobile
      }
    });
    res.json({ success: true, theme });
  } catch (error) {
    console.error("[updateEventTheme] Error:", error);
    res.status(500).json({ error: "Error al actualizar el tema" });
  }
};

export const updateEventGallery = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { images } = req.body; // Array of { url, alt, order }

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: "Imágenes inválidas" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear old gallery images
      await tx.galleryImage.deleteMany({ where: { eventId: id } });
      
      // Insert new gallery images
      if (images.length > 0) {
        await tx.galleryImage.createMany({
          data: images.map((img: any, index: number) => ({
            eventId: id,
            url: img.url,
            alt: img.alt || "",
            order: img.order !== undefined ? img.order : index
          }))
        });
      }
    });

    const updatedImages = await prisma.galleryImage.findMany({
      where: { eventId: id },
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, images: updatedImages });
  } catch (error) {
    console.error("[updateEventGallery] Error:", error);
    res.status(500).json({ error: "Error al actualizar la galería" });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { ticketTypes: { where: { isArchived: false } }, theme: true }
    });
    res.json({ events: events.map(e => ({ ...e, status: e.isPublished ? 'ACTIVE' : 'DRAFT' })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const newEvent = await prisma.event.create({
      data: {
        name: "NUEVA FIESTA",
        isPublished: false,
        date: "POR DEFINIR",
        location: "POR DEFINIR",
        logoText1: "NUEVA",
        logoText2: "",
        ticketTypes: {
          create: [
            { name: 'Taquilla / En Puerta', price: 10, maxStock: 9999, isDoorType: true }
          ]
        },
        theme: {
          create: {
            primaryColor: "#e63329",
            secondaryColor: "",
            backgroundImage: "",
            backgroundImageMobile: ""
          }
        }
      },
      include: { ticketTypes: true, theme: true }
    });
    res.json({ event: { ...newEvent, status: newEvent.isPublished ? 'ACTIVE' : 'DRAFT' } });
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

    if (event.tickets.length > 0) {
      return res.status(400).json({ error: "Cannot delete an event with sold tickets" });
    }

    await prisma.$transaction([
      prisma.theme.deleteMany({ where: { eventId: id } }),
      prisma.galleryImage.deleteMany({ where: { eventId: id } }),
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

    const userId = (req as any).user?.userId;

    if (!ticket) {
      await prisma.auditLog.create({
        data: {
          severity: 'WARNING',
          action: 'SCAN_FAILED_NOT_FOUND',
          details: `Attempted ID: ${ticketId}`,
          userId
        }
      });
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    if (ticket.status === 'USED') {
      await prisma.auditLog.create({
        data: {
          severity: 'ERROR',
          action: 'SCAN_FAILED_ALREADY_USED',
          details: `Ticket ${ticket.id} belonging to ${ticket.name} was rejected.`,
          userId
        }
      });
      return res.status(400).json({ error: "Esta entrada YA HA SIDO USADA" });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: "Esta entrada está CANCELADA" });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        status: 'USED',
        scannedAt: new Date(),
        scannedById: userId
      }
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'TICKET_VALIDATED',
        details: `Ticket ${updated.id} validated by ${userId}`,
        userId
      }
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

export const getEventAnalytics = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ error: "Missing event ID" });

    const event = await prisma.event.findUnique({
      where: { id: eventId as string },
      include: {
        tickets: {
          where: { status: { not: 'CANCELLED' } }
        },
        expenses: {
          orderBy: { createdAt: 'desc' }
        },
        ticketTypes: {
          where: { isArchived: false }
        }
      }
    });

    if (!event) return res.status(404).json({ error: "Event not found" });

    const totalRevenue = event.tickets.reduce((sum: number, t: any) => sum + (t.pricePaid || 0), 0);
    const totalExpenses = event.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const ticketsSold = event.tickets.length;
    const validatedCount = event.tickets.filter((t: any) => t.status === 'USED').length;
    const totalCapacity = event.ticketTypes.reduce((sum: number, tt: any) => sum + (tt.maxStock || 0), 0);

    // Calcular ventas agrupadas por día
    const salesByDayMap: Record<string, { count: number; revenue: number }> = {};
    // Calcular ventas agrupadas por hora
    const salesByHourMap: Record<string, number> = {};

    // Inicializar las 24 horas
    for (let i = 0; i < 24; i++) {
      const hh = String(i).padStart(2, '0') + ':00';
      salesByHourMap[hh] = 0;
    }

    event.tickets.forEach((t: any) => {
      const dayStr = format(new Date(t.createdAt), 'yyyy-MM-dd');
      if (!salesByDayMap[dayStr]) {
        salesByDayMap[dayStr] = { count: 0, revenue: 0 };
      }
      salesByDayMap[dayStr].count += 1;
      salesByDayMap[dayStr].revenue += t.pricePaid || 0;

      const hourStr = format(new Date(t.createdAt), 'HH') + ':00';
      if (salesByHourMap[hourStr] !== undefined) {
        salesByHourMap[hourStr] += 1;
      }
    });

    const salesByDay = Object.entries(salesByDayMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const salesByHour = Object.entries(salesByHourMap)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Ventas por tipo de entrada
    const salesByTicketType = event.ticketTypes.map((tt: any) => {
      const typeTickets = event.tickets.filter((t: any) => t.ticketTypeId === tt.id);
      const sold = typeTickets.length;
      const revenue = typeTickets.reduce((sum: number, t: any) => sum + (t.pricePaid || 0), 0);
      return {
        id: tt.id,
        name: tt.name,
        sold,
        revenue,
        maxStock: tt.maxStock
      };
    });

    res.json({
      success: true,
      analytics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        ticketsSold,
        validatedCount,
        totalCapacity,
        expenses: event.expenses,
        salesByDay,
        salesByHour,
        salesByTicketType
      }
    });
  } catch (error) {
    console.error("[getEventAnalytics] Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getEventAttendance = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ error: "Missing event ID" });

    const [ticketsSold, validatedCount] = await prisma.$transaction([
      prisma.ticket.count({
        where: { eventId: eventId as string, status: { not: 'CANCELLED' } }
      }),
      prisma.ticket.count({
        where: { eventId: eventId as string, status: 'USED' }
      })
    ]);

    res.json({ success: true, ticketsSold, validatedCount });
  } catch (error) {
    console.error("[getEventAttendance] Error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

export const processWalkIn = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, eventId, pricePaid, paymentMethod } = req.body;
  if (!buyerName || !buyerEmail || !eventId) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    const doorTicketType = await prisma.ticketType.findFirst({
      where: { eventId, isDoorType: true }
    });

    if (!doorTicketType) {
      return res.status(404).json({ error: "Tipo de entrada de puerta no encontrado." });
    }

    const { ticket, order } = await prisma.$transaction(async (tx) => {
      await tx.ticketType.update({
        where: { id: doorTicketType.id },
        data: { soldCount: { increment: 1 } }
      });

      const order = await tx.order.create({
        data: {
          eventId,
          customerName: buyerName,
          customerEmail: buyerEmail,
          totalPaid: pricePaid !== undefined ? parseFloat(String(pricePaid)) : doorTicketType.price,
          paymentIntent: `${paymentMethod || 'DOOR'}_${Date.now()}`,
          status: 'COMPLETED'
        }
      });

      const ticket = await tx.ticket.create({
        data: {
          eventId,
          ticketTypeId: doorTicketType.id,
          orderId: order.id,
          name: buyerName,
          email: buyerEmail,
          status: 'USED', // Used immediately on door registration
          pricePaid: pricePaid !== undefined ? parseFloat(String(pricePaid)) : doorTicketType.price,
          scannedAt: new Date(),
          scannedById: (req as any).user?.userId
        }
      });

      return { ticket, order };
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'WALK_IN_SALE',
        details: `Walk-in ticket registered for ${buyerName} (${buyerEmail}). Price paid: ${pricePaid !== undefined ? pricePaid : doorTicketType.price}`,
        userId: (req as any).user?.userId
      }
    });

    res.json({
      success: true,
      message: 'Venta en puerta registrada',
      ticket,
      order
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la venta en puerta' });
  }
};
