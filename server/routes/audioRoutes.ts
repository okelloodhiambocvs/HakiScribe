import { Router } from 'express';
import multer from 'multer';
import { AudioController } from '../controllers/audioController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const audioRouter = Router();

audioRouter.post('/upload', upload.single('audio'), AudioController.upload);
audioRouter.post('/:id/transcribe', AudioController.transcribe);
