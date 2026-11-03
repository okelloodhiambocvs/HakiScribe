import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';

export const sessionRouter = Router();

sessionRouter.post('/', SessionController.create);
sessionRouter.post('/demo', SessionController.loadDemo);
sessionRouter.get('/', SessionController.listAll);
sessionRouter.get('/:id', SessionController.getById);
sessionRouter.delete('/:id', SessionController.deleteSession);
