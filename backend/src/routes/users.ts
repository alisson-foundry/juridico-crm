import { Router } from 'express';
import { list, create, update, remove } from '../controllers/users.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
export default router;
