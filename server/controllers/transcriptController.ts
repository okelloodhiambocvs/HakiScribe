import { Request, Response } from 'express';
import { TranscriptionService } from '../services/transcriptionService';
import { ReviewService } from '../services/reviewService';
import { SegmentRepo } from '../db/repositories/segmentRepo';
import { CorrectionRepo } from '../db/repositories/correctionRepo';
import { ApiResponse, Transcript, TranscriptCorrection, TranscriptSegment } from '../../shared/types';
import { parseIdParam } from '../utils/params';

export class TranscriptController {
  static getTranscript(req: Request, res: Response<ApiResponse<Transcript>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const transcript = TranscriptionService.getTranscript(recordingId);
      res.json({ success: true, data: transcript });
    } catch (err: any) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    }
  }

  static getSegments(req: Request, res: Response<ApiResponse<TranscriptSegment[]>>): void {
    const recordingId = parseIdParam(req.params.id);
    const segments = SegmentRepo.getByRecordingId(recordingId);
    res.json({ success: true, data: segments });
  }

  static editSegment(req: Request, res: Response<ApiResponse<{ segment: TranscriptSegment; correction: TranscriptCorrection }>>): void {
    try {
      const segmentId = parseIdParam(req.params.segmentId);
      const { text, reviewer, reason } = req.body;

      const result = ReviewService.editSegmentText(segmentId, text, reviewer, reason);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'EDIT_FAILED', message: err.message } });
    }
  }

  static getHistory(req: Request, res: Response<ApiResponse<TranscriptCorrection[]>>): void {
    const recordingId = parseIdParam(req.params.id);
    const corrections = CorrectionRepo.getByRecordingId(recordingId);
    res.json({ success: true, data: corrections });
  }
}
