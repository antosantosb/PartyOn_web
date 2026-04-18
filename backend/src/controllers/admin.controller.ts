import { Request, Response } from 'express';
import { prisma } from '../index';

export const getStoreData = async (req: Request, res: Response) => {
  try {
    let event = await prisma.event.findFirst({
      include: { ticketTypes: true, theme: true }
    });

    if (!event) {
      // Seed default
      event = await prisma.event.create({
        data: {
          name: "EL PERREO INTENSO",
          date: "SÁBADO 15 NOVIEMBRE",
          location: "CLUB NOSTALGIA, MADRID",
          artistInfo: "DJ ALVARO + GUEST STARS",
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

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventData.id },
      data: {
        name: eventData.partyName || eventData.name,
        date: eventData.date,
        location: eventData.location,
        artistInfo: eventData.artistInfo,
        logoText1: eventData.logoText1,
        logoText2: eventData.logoText2,
      }
    });

    // Update Theme
    if (theme && theme.id) {
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
