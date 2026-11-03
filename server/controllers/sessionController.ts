import { Request, Response } from 'express';
import { SessionService } from '../services/sessionService';
import { ApiResponse, RecordingSession } from '../../shared/types';
import { parseIdParam } from '../utils/params';

export class SessionController {
  static create(req: Request, res: Response<ApiResponse<RecordingSession>>): void {
    try {
      const { filename, storedPath, sha256, sizeBytes, durationSec, uploadedBy, syntheticAttestation, captureSource } = req.body;
      const session = SessionService.createSession({
        filename,
        storedPath,
        sha256,
        sizeBytes,
        durationSec,
        uploadedBy,
        syntheticAttestation,
        captureSource,
      });
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SESSION_CREATE_FAILED', message: err.message } });
    }
  }

  static loadDemo(req: Request, res: Response<ApiResponse<RecordingSession>>): void {
    try {
      const reviewer = (req.body.reviewer || 'Judicial Clerk').trim();
      const session = SessionService.loadDemoSession(reviewer);
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'LOAD_DEMO_FAILED', message: err.message } });
    }
  }

  static getById(req: Request, res: Response<ApiResponse<RecordingSession>>): void {
    try {
      const id = parseIdParam(req.params.id);
      const session = SessionService.getSession(id);
      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    }
  }

  static listAll(req: Request, res: Response<ApiResponse<RecordingSession[]>>): void {
    const list = SessionService.listSessions();
    res.json({ success: true, data: list });
  }

  static deleteSession(req: Request, res: Response<ApiResponse<{ message: string; recording_id: number }>>): void {
    try {
      const id = parseIdParam(req.params.id);
      const { reviewer, confirmation } = req.body;
      SessionService.deleteSession(id, reviewer, confirmation);
      res.json({ success: true, data: { message: 'Session permanently removed with content-free log entry.', recording_id: id } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: err.message } });
    }
  }
}
