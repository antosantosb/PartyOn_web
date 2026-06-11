import { Router } from 'express';
import { getUsers, createUser, updateUser, resetPassword, deleteUser } from '../controllers/user.controller';
import { authMiddleware, authorize } from '../middleware/auth.middleware';

const router = Router();

// Require authenticated ADMIN or DEV roles for all routes
router.use(authMiddleware);
router.use(authorize(['ADMIN', 'DEV']));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.patch('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

export default router;
