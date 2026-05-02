import { Router } from 'express';
import {
  listByClient,
  create,
  update,
  remove,
  getAuditLogs,
} from '../controllers/activities.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/clients/:clientId/activities', listByClient);
router.post('/clients/:clientId/activities', create);
router.put('/activities/:id', update);
router.delete('/activities/:id', remove);
router.get('/activities/:id/logs', getAuditLogs);
export default router;
