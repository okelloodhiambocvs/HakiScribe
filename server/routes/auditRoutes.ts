import { Router } from 'express';
import { AuditController } from '../controllers/auditController';

export const auditRouter = Router();

auditRouter.get('/events', AuditController.getEvents);
auditRouter.get('/ledger', AuditController.getLedger);
auditRouter.get('/health', AuditController.getSystemHealth);
