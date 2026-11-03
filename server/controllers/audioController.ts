import { Request, Response } from 'express';
import { AudioService } from '../services/audioService';
import { SessionService } from '../services/sessionService';
import { TranscriptionService } from '../services/transcriptionService';
import { ApiResponse, RecordingSession, Transcript } from '../../shared/types';
import { parseIdParam } from '../utils/params';

export class AudioController {
  static upload(req: Request, res: Response<ApiResponse<RecordingSession>>): void {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No audio file provided in request.' } });
        return;
      }

      const reviewer = (req.body.reviewer || '').trim();
      const attestation = req.body.synthetic_attestation === 'true' || req.body.synthetic_attestation === true;

      const validated = AudioService.validateAudioFile(req.file);
      const session = SessionService.createSession({
        filename: validated.filename,
        storedPath: validated.storedPath,
        sha256: validated.sha256,
        sizeBytes: validated.sizeBytes,
        durationSec: 60.0,
        uploadedBy: reviewer,
        syntheticAttestation: attestation,
        captureSource: 'upload',
      });

      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: err.message } });
    }
  }

  static async transcribe(req: Request, res: Response<ApiResponse<Transcript>>): Promise<void> {
    try {
      const recordingId = parseIdParam(req.params.id);
      const forceMock = req.body.forceMock === true || req.body.forceMock === 'true';

      const transcript = await TranscriptionService.transcribeSession(recordingId, forceMock);
      res.json({ success: true, data: transcript });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TRANSCRIBE_FAILED', message: err.message } });
    }
  }
}
