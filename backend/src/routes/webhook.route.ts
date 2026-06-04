import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/', handleStripeWebhook);

export default router;
