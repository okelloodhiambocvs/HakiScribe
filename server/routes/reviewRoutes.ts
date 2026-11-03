import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';

export const reviewRouter = Router();

reviewRouter.post('/:id/run', ReviewController.triggerReview);
reviewRouter.get('/:id/flags', ReviewController.getFlags);
reviewRouter.post('/flags/:flagId/decide', ReviewController.decideFlag);
reviewRouter.post('/:id/roles', ReviewController.assignRole);
reviewRouter.get('/:id/roles', ReviewController.getRoles);
