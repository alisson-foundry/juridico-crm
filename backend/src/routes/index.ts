import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import activityRoutes from './activities';
import fileRoutes from './files';
import userRoutes from './users';
import notificationRoutes from './notifications';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/', activityRoutes);
router.use('/files', fileRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

export default router;
