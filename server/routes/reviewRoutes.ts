import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';

export const reviewRouter = Router();

reviewRouter.post('/:id/run', ReviewController.triggerReview);
reviewRouter.get('/:id/flags', ReviewController.getFlags);
reviewRouter.post('/flags/:flagId/decide', ReviewController.decideFlag);
reviewRouter.post('/:id/roles', ReviewController.assignRole);
reviewRouter.get('/:id/roles', ReviewController.getRoles);
reviewRouter.post('/:id/roles/clear', ReviewController.clearRole);
reviewRouter.post('/:id/participants', ReviewController.registerParticipant);
reviewRouter.get('/:id/participants', ReviewController.listParticipants);
reviewRouter.post('/:id/participants/:participantId/verify', ReviewController.verifyParticipant);
reviewRouter.delete('/:id/participants/:participantId', ReviewController.deleteParticipant);
