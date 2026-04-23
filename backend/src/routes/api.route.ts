import { Router } from 'express';
import { getStoreData, updateStoreData, validateTicket, getAllEvents, createEvent, deleteEvent } from '../controllers/admin.controller';
import { createPaymentIntent, processCheckout } from '../controllers/checkout.controller';
import { updateTicketTypes } from '../controllers/ticketType.controller';
import { login } from '../controllers/auth.controller';
import { getDatabaseStats, getSystemLogs, searchTickets } from '../controllers/dev.controller';
import { upload } from '../index';

import { authMiddleware } from '../middleware/auth.middleware';


const router = Router();

// Public routes
router.get('/store-data', getStoreData);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/checkout', processCheckout);
router.post('/auth/login', login);

// Protected Admin routes
router.post('/store-data', authMiddleware, updateStoreData);
router.post('/ticket-types', authMiddleware, updateTicketTypes);
router.get('/admin/events', authMiddleware, getAllEvents);
router.post('/admin/events', authMiddleware, createEvent);
router.delete('/admin/events/:id', authMiddleware, deleteEvent);
router.post('/admin/tickets/validate', authMiddleware, validateTicket);

// Dev / God Mode routes
router.get('/admin/dev/database-stats', authMiddleware, getDatabaseStats);
router.get('/admin/dev/system-logs', authMiddleware, getSystemLogs);
router.get('/admin/dev/tickets/search', authMiddleware, searchTickets);

router.post('/upload-image', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  const publicUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});



export default router;
