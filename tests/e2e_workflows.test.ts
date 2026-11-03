import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { WebSocket } from 'ws';
import { initDatabase, db } from '../server/db/database';
import { SessionService } from '../server/services/sessionService';
import { TranscriptionService } from '../server/services/transcriptionService';
import { ReviewService } from '../server/services/reviewService';
import { ExportService } from '../server/services/exportService';
import { RealtimeTranscribeBridge } from '../server/integrations/meta/realtimeTranscribe';
import { AuditRepo } from '../server/db/repositories/auditRepo';
import { SegmentRepo } from '../server/db/repositories/segmentRepo';
import { FlagRepo } from '../server/db/repositories/flagRepo';
import { CorrectionRepo } from '../server/db/repositories/correctionRepo';

describe('End-to-End Workflow Verification: Workflows A through E', () => {
  before(() => {
    initDatabase();
  });

  describe('WORKFLOW A: Live Recording & Realtime Transcription', () => {
    it('initializes live session, streams audio chunks via bridge, and logs session audit', async () => {
      // 1. Create live recording session in database
      const liveSession = SessionService.createSession({
        filename: 'live-courtroom-hearing-001.wav',
        storedPath: 'storage/uploads/live-courtroom-hearing-001.wav',
        sha256: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
        sizeBytes: 153600,
        durationSec: 15.0,
        uploadedBy: 'Court Reporter Chebet',
        syntheticAttestation: true,
        captureSource: 'live',
      });

      assert.strictEqual(liveSession.capture_source, 'live');
      assert.strictEqual(liveSession.status, 'UPLOADED');

      // 2. Simulate WebSocket client and bridge
      const receivedMessages: any[] = [];
      const fakeClientWs = {
        readyState: WebSocket.OPEN,
        send: (msg: string) => {
          receivedMessages.push(JSON.parse(msg));
        },
      } as any;

      const bridge = new RealtimeTranscribeBridge(fakeClientWs);
      bridge.initSession();

      // 3. Send mock audio chunks
      const dummyPcm = Buffer.alloc(960); // 24kHz mono PCM frame
      bridge.handleAudioChunk(dummyPcm);

      // 4. Close session and check audit logging
      bridge.close();

      const apiLogs = db.prepare('SELECT * FROM api_calls WHERE service = ?').all('muse-realtime-transcribe');
      assert.ok(apiLogs.length >= 1, 'Realtime API call logged to audit ledger');
    });
  });

  describe('WORKFLOW B: Prerecorded Audio Ingestion & Diarization', () => {
    it('processes synthetic courtroom audio and stores diarized speech turns', async () => {
      // 1. Ingest session
      const session = SessionService.loadDemoSession('Auditor Kipchoge');
      assert.strictEqual(session.status, 'UPLOADED');

      // 2. Initiate batch transcription
      const transcript = await TranscriptionService.transcribeSession(session.id, true);
      assert.strictEqual(transcript.recording_id, session.id);
      assert.strictEqual(transcript.segments.length, 16, 'Full 16-turn synthetic hearing transcribed');

      // 3. Verify turn segmentation and speaker labels
      const firstTurn = transcript.segments[0];
      assert.strictEqual(firstTurn.speaker_label, 'Speaker A');
      assert.strictEqual(firstTurn.start_sec, 0.4);
      assert.strictEqual(firstTurn.end_sec, 4.2);
      assert.strictEqual(firstTurn.text_original, 'Court is now in session. Case number CR 123 of 2026.');

      // 4. Verify confidence is null (Meta Voice Transcribe API requirement)
      assert.strictEqual(firstTurn.confidence, null);
    });
  });

  describe('WORKFLOW C: Human Review, AI Suggestion Quoting & Correction Ledger', () => {
    it('executes AI review with quote guardrails and applies human corrections with audit trail', async () => {
      const session = SessionService.loadDemoSession('Reviewer Wangari');
      await TranscriptionService.transcribeSession(session.id, true);

      // 1. AI Review trigger
      const reviewResult = await ReviewService.triggerAiReview(session.id, true);
      assert.ok(reviewResult.flags.length > 0);
      assert.ok(reviewResult.flags_dropped >= 1, 'Hallucinated flag candidate dropped');

      // 2. Verify all retained flags contain verbatim quotations
      const flags = FlagRepo.getByRecordingId(session.id);
      for (const flag of flags) {
        assert.strictEqual(flag.evidence_verified, 1);
        const seg = SegmentRepo.getById(flag.segment_id);
        assert.ok(seg);
        assert.ok(
          seg.text_original.toLowerCase().includes(flag.evidence.toLowerCase().trim()),
          `Flag evidence "${flag.evidence}" must exist verbatim in "${seg.text_original}"`
        );
      }

      // 3. Human correction applied
      const seg = SegmentRepo.getByRecordingId(session.id)[0];
      const revised = 'Court is now in session. Case number CR 123/2026.';
      const { segment: updated, correction } = ReviewService.editSegmentText(
        seg.id,
        revised,
        'Reviewer Wangari',
        'Standard court case number convention'
      );

      assert.strictEqual(updated.text_current, revised);
      assert.strictEqual(updated.text_original, seg.text_original);
      assert.strictEqual(correction.before_text, seg.text_original);
      assert.strictEqual(correction.after_text, revised);

      // 4. Decide on an AI flag
      const firstFlag = flags[0];
      const { flag: decided } = ReviewService.decideFlag(
        firstFlag.id,
        'ACCEPT',
        'Reviewer Wangari',
        'Accepted date amendment'
      );
      assert.strictEqual(decided.status, 'RESOLVED');
    });
  });

  describe('WORKFLOW D: Document Export & Draft Watermarking', () => {
    it('generates a draft DOCX document with prominent draft notices and quality metrics', async () => {
      const session = SessionService.loadDemoSession('Stenographer Mutua');
      await TranscriptionService.transcribeSession(session.id, true);

      const { exportDoc, filePath } = await ExportService.generateDraftDocx(
        session.id,
        'Stenographer Mutua'
      );

      assert.ok(exportDoc.docx_filename.startsWith('HakiScribe_Draft_'));
      assert.strictEqual(exportDoc.generated_by, 'Stenographer Mutua');
      assert.ok(exportDoc.summary_en.length > 0);
      assert.ok(exportDoc.summary_sw.length > 0);

      // Verify quality metrics computation
      assert.ok(exportDoc.metrics);
      assert.ok(exportDoc.metrics.ai_vs_reviewed);
      assert.ok(exportDoc.metrics.traceability);
      assert.strictEqual(exportDoc.metrics.traceability.values.completeness_pct, 100);
    });
  });

  describe('WORKFLOW E: History, Audit Retrieval & Content-Free Deletion', () => {
    it('searches and retrieves sessions, audit events, and executes verifiable deletion', () => {
      const session = SessionService.loadDemoSession('Auditor Ochieng');

      // Retrieve session
      const fetched = SessionService.getSession(session.id);
      assert.strictEqual(fetched.id, session.id);

      // Retrieve audit events
      const events = AuditRepo.getEvents(session.id);
      assert.ok(events.length >= 1);

      // Permanent deletion
      SessionService.deleteSession(session.id, 'Auditor Ochieng', 'DELETE');

      // Verify session gone
      assert.throws(() => SessionService.getSession(session.id), /not found/);

      // Verify content-free deletion receipt exists in deletion_log
      const receipts = db.prepare('SELECT * FROM deletion_log WHERE recording_id = ?').all(session.id);
      assert.strictEqual(receipts.length, 1);
      assert.strictEqual(receipts[0].reviewer, 'Auditor Ochieng');
    });
  });
});
