import { Router } from 'express';
import { getStoreData, updateStoreData } from '../controllers/admin.controller';
import { processCheckout } from '../controllers/checkout.controller';

const router = Router();

router.get('/store-data', getStoreData);
router.post('/store-data', updateStoreData);
router.post('/checkout', processCheckout);

export default router;
