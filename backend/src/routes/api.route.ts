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
import { createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller';
import { exportTicketsCSV } from '../controllers/export.controller';
import { upload, prisma } from '../index';

import { authMiddleware, authorize } from '../middleware/auth.middleware';
import { loginLimiter, paymentIntentLimiter, checkoutLimiter } from '../middleware/rateLimit.middleware';
import userRouter from './user.route';

const router = Router();

router.use('/admin/users', userRouter);

// Public routes
router.get('/store-data', getStoreData); // Compatibility endpoint
router.get('/events/active', getActiveEvent);
router.post('/create-payment-intent', paymentIntentLimiter, createPaymentIntent);
router.post('/checkout', checkoutLimiter, processCheckout);
router.post('/auth/login', loginLimiter, login);

// Protected Admin routes (ADMIN and DEV only)
router.post('/store-data', authMiddleware, authorize(['ADMIN', 'DEV']), updateStoreDataCompat); // Compatibility fallback
router.post('/ticket-types', authMiddleware, authorize(['ADMIN', 'DEV']), updateTicketTypes); // Compatibility fallback
router.patch('/admin/events/:id', authMiddleware, authorize(['ADMIN', 'DEV']), updateEvent);
router.patch('/admin/events/:id/theme', authMiddleware, authorize(['ADMIN', 'DEV']), updateEventTheme);
router.patch('/admin/events/:id/gallery', authMiddleware, authorize(['ADMIN', 'DEV']), updateEventGallery);
router.post('/admin/events/:id/ticket-types', authMiddleware, authorize(['ADMIN', 'DEV']), updateTicketTypes);
router.get('/admin/events', authMiddleware, authorize(['ADMIN', 'DEV']), getAllEvents);
router.post('/admin/events', authMiddleware, authorize(['ADMIN', 'DEV']), createEvent);
router.delete('/admin/events/:id', authMiddleware, authorize(['ADMIN', 'DEV']), deleteEvent);
router.get('/admin/management/analytics/:eventId', authMiddleware, authorize(['ADMIN', 'DEV']), getEventAnalytics);
router.post('/admin/management/expenses', authMiddleware, authorize(['ADMIN', 'DEV']), createExpense);
router.put('/admin/management/expenses/:id', authMiddleware, authorize(['ADMIN', 'DEV']), updateExpense);
router.delete('/admin/management/expenses/:id', authMiddleware, authorize(['ADMIN', 'DEV']), deleteExpense);
router.get('/admin/management/export-csv/:eventId', authMiddleware, authorize(['ADMIN', 'DEV']), exportTicketsCSV);

// Validation & Walk-in Registration (Accessible by ADMIN, DEV, and STAFF)
router.post('/admin/tickets/validate', authMiddleware, authorize(['ADMIN', 'DEV', 'STAFF']), validateTicket);
router.post('/admin/tickets/walk-in', authMiddleware, authorize(['ADMIN', 'DEV', 'STAFF']), processWalkIn);

// Dev / God Mode routes (DEV only)
router.get('/admin/dev/database-stats', authMiddleware, authorize(['DEV']), getDatabaseStats);
router.get('/admin/dev/system-logs', authMiddleware, authorize(['DEV']), getSystemLogs);
router.get('/admin/dev/tickets/search', authMiddleware, authorize(['DEV']), searchTickets);

router.post('/upload-image', authMiddleware, authorize(['ADMIN', 'DEV']), upload.single('image'), (req, res) => {
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
