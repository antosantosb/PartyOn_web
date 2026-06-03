import { Router } from 'express';
import { 
  getStoreData, 
  getActiveEvent,
  updateEvent,
  updateEventTheme,
  updateEventGallery,
  validateTicket, 
  getAllEvents, 
  createEvent, 
  deleteEvent, 
  getEventAnalytics,
  processWalkIn
} from '../controllers/admin.controller';
import { createPaymentIntent, processCheckout } from '../controllers/checkout.controller';
import { updateTicketTypes } from '../controllers/ticketType.controller';
import { login } from '../controllers/auth.controller';
import { getDatabaseStats, getSystemLogs, searchTickets } from '../controllers/dev.controller';
import { upload, prisma } from '../index';

import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/store-data', getStoreData); // Compatibility endpoint
router.get('/events/active', getActiveEvent);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/checkout', processCheckout);
router.post('/auth/login', login);

// Protected Admin routes
router.post('/store-data', authMiddleware, updateStoreDataCompat); // Compatibility fallback
router.post('/ticket-types', authMiddleware, updateTicketTypes); // Compatibility fallback
router.patch('/admin/events/:id', authMiddleware, updateEvent);
router.patch('/admin/events/:id/theme', authMiddleware, updateEventTheme);
router.patch('/admin/events/:id/gallery', authMiddleware, updateEventGallery);
router.post('/admin/events/:id/ticket-types', authMiddleware, updateTicketTypes);
router.get('/admin/events', authMiddleware, getAllEvents);
router.post('/admin/events', authMiddleware, createEvent);
router.delete('/admin/events/:id', authMiddleware, deleteEvent);
router.post('/admin/tickets/validate', authMiddleware, validateTicket);
router.get('/admin/management/analytics/:eventId', authMiddleware, getEventAnalytics);

// Walk-in Registration (Door Sales)
router.post('/admin/tickets/walk-in', authMiddleware, processWalkIn);

// Dev / God Mode routes
router.get('/admin/dev/database-stats', authMiddleware, getDatabaseStats);
router.get('/admin/dev/system-logs', authMiddleware, getSystemLogs);
router.get('/admin/dev/tickets/search', authMiddleware, searchTickets);

router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  const publicUrl = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});

// Helper for backward compatibility
async function updateStoreDataCompat(req: any, res: any) {
  try {
    const { eventData, theme } = req.body;
    if (!eventData || !eventData.id) {
      return res.status(400).json({ error: "No event ID provided" });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventData.id },
      data: {
        name: eventData.partyName || eventData.name,
        tagline: eventData.tagline,
        date: eventData.date,
        startsAt: eventData.startsAt ? new Date(eventData.startsAt) : null,
        endsAt: eventData.endsAt ? new Date(eventData.endsAt) : null,
        location: eventData.location,
        lineup: eventData.lineup,
        tickerText: eventData.tickerText,
        logoText1: eventData.logoText1 || '',
        logoText2: '',
        emailSubject: eventData.emailSubject,
        emailBody: eventData.emailBody,
        isPublished: eventData.status === 'ACTIVE'
      }
    });

    if (theme) {
      await prisma.theme.upsert({
        where: { eventId: eventData.id },
        create: {
          eventId: eventData.id,
          primaryColor: theme.primaryColor || "#e63329",
          secondaryColor: "",
          backgroundImage: theme.backgroundImage || "",
          backgroundImageMobile: theme.backgroundImageMobile || ""
        },
        update: {
          primaryColor: theme.primaryColor,
          secondaryColor: "",
          backgroundImage: theme.backgroundImage,
          backgroundImageMobile: theme.backgroundImageMobile
        }
      });
    }

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update store data compatibility" });
  }
}

export default router;
