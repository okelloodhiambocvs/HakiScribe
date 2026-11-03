import { Router } from 'express';
import { ExportController } from '../controllers/exportController';

export const exportRouter = Router();

exportRouter.post('/:id/docx', ExportController.generateDocx);
exportRouter.get('/:id/latest', ExportController.getLatest);
exportRouter.get('/download/:filename', ExportController.downloadFile);
