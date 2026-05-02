import { Router } from 'express';
import { list, getOne, create, update, remove } from '../controllers/clients.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);
export default router;
