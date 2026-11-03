import { Router } from 'express';
import { TranscriptController } from '../controllers/transcriptController';

export const transcriptRouter = Router();

transcriptRouter.get('/:id', TranscriptController.getTranscript);
transcriptRouter.get('/:id/segments', TranscriptController.getSegments);
transcriptRouter.put('/segments/:segmentId', TranscriptController.editSegment);
transcriptRouter.get('/:id/history', TranscriptController.getHistory);
