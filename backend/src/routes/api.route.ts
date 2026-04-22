import { Router } from 'express';
import { getStoreData, updateStoreData, validateTicket, getAllEvents, createEvent, deleteEvent } from '../controllers/admin.controller';
import { createPaymentIntent, processCheckout } from '../controllers/checkout.controller';
import { updateTicketTypes } from '../controllers/ticketType.controller';
import { login } from '../controllers/auth.controller';

const router = Router();

router.get('/store-data', getStoreData);
router.post('/store-data', updateStoreData);
router.post('/ticket-types', updateTicketTypes);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/checkout', processCheckout);

router.get('/admin/events', getAllEvents);
router.post('/admin/events', createEvent);
router.delete('/admin/events/:id', deleteEvent);
router.post('/admin/tickets/validate', validateTicket);
router.post('/auth/login', login);

export default router;
