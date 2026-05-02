import { Router } from 'express';
import { list, markRead, markAllRead } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', list);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);
export default router;
