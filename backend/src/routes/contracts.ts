import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  list,
  getOne,
  create,
  update,
  remove,
  payInstallment,
  downloadReceipt,
  markOverdue,
} from '../controllers/contracts.controller';

const router = Router();

router.get('/clients/:clientId/contracts', authenticate, list);
router.post('/clients/:clientId/contracts', authenticate, create);
router.get('/contracts/:id', authenticate, getOne);
router.patch('/contracts/:id', authenticate, update);
router.delete('/contracts/:id', authenticate, remove);
router.patch('/installments/:id/pay', authenticate, upload.single('receipt'), payInstallment);
router.get('/installments/:id/receipt', authenticate, downloadReceipt);
router.post('/installments/mark-overdue', authenticate, markOverdue);

export default router;
