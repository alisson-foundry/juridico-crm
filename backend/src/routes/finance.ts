import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getSummary, listInstallments } from '../controllers/finance.controller';

const router = Router();

router.get('/finance/summary', authenticate, getSummary);
router.get('/finance/installments', authenticate, listInstallments);

export default router;
