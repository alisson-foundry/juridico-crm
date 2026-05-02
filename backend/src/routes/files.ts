import { Router } from 'express';
import { upload as uploadFile, download, remove } from '../controllers/files.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);
router.post('/activities/:activityId/files', upload.single('file'), uploadFile);
router.get('/:id/download', download);
router.delete('/:id', remove);
export default router;
