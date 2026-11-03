import { Router } from 'express';
import { AuthController } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.get('/me', AuthController.getCurrentUser);
authRouter.get('/users', AuthController.listUsers);
