import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import activityRoutes from './activities';
import fileRoutes from './files';
import userRoutes from './users';
import notificationRoutes from './notifications';
import contractRoutes from './contracts';
import financeRoutes from './finance';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/', activityRoutes);
router.use('/files', fileRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', contractRoutes);
router.use('/', financeRoutes);

export default router;
