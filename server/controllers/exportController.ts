import { Request, Response } from 'express';
import fs from 'fs';
import { ExportService } from '../services/exportService';
import { ExportRepo } from '../db/repositories/exportRepo';
import { ApiResponse, ExportDocument } from '../../shared/types';
import { parseIdParam, parseStringParam } from '../utils/params';

export class ExportController {
  static async generateDocx(req: Request, res: Response<ApiResponse<ExportDocument>>): Promise<void> {
    try {
      const recordingId = parseIdParam(req.params.id);
      const reviewer = (req.body.reviewer || '').trim();

      const { exportDoc } = await ExportService.generateDraftDocx(recordingId, reviewer);
      res.json({ success: true, data: exportDoc });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'EXPORT_FAILED', message: err.message } });
    }
  }

  static getLatest(req: Request, res: Response<ApiResponse<ExportDocument | null>>): void {
    const recordingId = parseIdParam(req.params.id);
    const latest = ExportRepo.getLatestByRecordingId(recordingId);
    res.json({ success: true, data: latest });
  }

  static downloadFile(req: Request, res: Response): void {
    try {
      const filename = parseStringParam(req.params.filename);
      const filePath = ExportService.getExportFilePath(filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exported file not found.' } });
        return;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: err.message } });
    }
  }
}
