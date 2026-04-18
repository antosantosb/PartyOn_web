import { Router } from 'express';
import { getStoreData, updateStoreData } from '../controllers/admin.controller';
import { createPaymentIntent, processCheckout } from '../controllers/checkout.controller';
import { updateTicketTypes } from '../controllers/ticketType.controller';

const router = Router();

router.get('/store-data', getStoreData);
router.post('/store-data', updateStoreData);
router.post('/ticket-types', updateTicketTypes);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/checkout', processCheckout);

export default router;
