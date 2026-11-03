import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { db, initDatabase } from '../server/db/database';
import { SessionRepo } from '../server/db/repositories/sessionRepo';
import { SegmentRepo } from '../server/db/repositories/segmentRepo';
import { FlagRepo } from '../server/db/repositories/flagRepo';
import { CorrectionRepo } from '../server/db/repositories/correctionRepo';
import { RoleRepo } from '../server/db/repositories/roleRepo';
import { ExportRepo } from '../server/db/repositories/exportRepo';
import { AuditRepo } from '../server/db/repositories/auditRepo';
import { SessionService } from '../server/services/sessionService';
import { TranscriptionService } from '../server/services/transcriptionService';
import { ReviewService } from '../server/services/reviewService';
import { ExportService } from '../server/services/exportService';

describe('Integration Tests: Coordinated API & Data Operations', () => {
  let testSessionId: number;

  before(() => {
    initDatabase();
  });

  describe('1. Session Creation & Ingestion API', () => {
    it('creates a new session with valid metadata, SHA-256 fingerprint, and audit trail', () => {
      const session = SessionService.createSession({
        filename: 'integration-test-case-001.wav',
        storedPath: 'storage/uploads/integration-test-case-001.wav',
        sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        sizeBytes: 204800,
        durationSec: 45.0,
        uploadedBy: 'Clerk Maina',
        syntheticAttestation: true,
        captureSource: 'upload',
      });

      testSessionId = session.id;
      assert.ok(testSessionId > 0);
      assert.strictEqual(session.filename, 'integration-test-case-001.wav');
      assert.strictEqual(session.uploaded_by, 'Clerk Maina');
      assert.strictEqual(session.status, 'UPLOADED');

      // Verify audit event was logged
      const events = AuditRepo.getEvents(testSessionId);
      assert.ok(events.length >= 1);
      assert.strictEqual(events[0].action, 'SESSION_CREATED');
      assert.strictEqual(events[0].actor, 'Clerk Maina');
    });

    it('retrieves session by ID and lists in all sessions', () => {
      const fetched = SessionService.getSession(testSessionId);
      assert.strictEqual(fetched.id, testSessionId);

      const all = SessionService.listSessions();
      assert.ok(all.some((s) => s.id === testSessionId));
    });
  });

  describe('2. Diarized Transcription & Immutability Integration', () => {
    it('transcribes session, populates segments, and preserves original text', async () => {
      const transcript = await TranscriptionService.transcribeSession(testSessionId, true);
      assert.strictEqual(transcript.recording_id, testSessionId);
      assert.ok(transcript.segments.length > 0);

      // Verify segments in database
      const dbSegments = SegmentRepo.getByRecordingId(testSessionId);
      assert.strictEqual(dbSegments.length, transcript.segments.length);

      for (const seg of dbSegments) {
        assert.ok(seg.text_original.length > 0);
        assert.strictEqual(seg.text_current, seg.text_original, 'Current starts equal to original');
        assert.strictEqual(seg.confidence, null, 'Confidence null per Meta Voice API');
        assert.ok(seg.speaker_label.startsWith('Speaker '));
      }

      // Check session status transition
      const updatedSession = SessionRepo.getById(testSessionId);
      assert.strictEqual(updatedSession?.status, 'TRANSCRIBED');
    });
  });

  describe('3. Human Review & Correction Ledger Integration', () => {
    it('applies correction with mandatory rationale and writes to corrections ledger', () => {
      const segments = SegmentRepo.getByRecordingId(testSessionId);
      const segToEdit = segments[0];
      const revisedText = 'Court is now in session. Case number CR 123/2026.';
      const reviewer = 'Senior Clerk Wanjiku';
      const reason = 'Formatted statutory case numbering with standard slash notation.';

      const { segment: updatedSeg, correction } = ReviewService.editSegmentText(
        segToEdit.id,
        revisedText,
        reviewer,
        reason
      );

      assert.strictEqual(updatedSeg.text_current, revisedText);
      assert.strictEqual(updatedSeg.text_original, segToEdit.text_original, 'Original text unchanged');

      // Verify correction row created in database
      const history = CorrectionRepo.getByRecordingId(testSessionId);
      assert.ok(history.length >= 1);
      const latestCorrection = history[0];
      assert.strictEqual(latestCorrection.segment_id, segToEdit.id);
      assert.strictEqual(latestCorrection.before_text, segToEdit.text_original);
      assert.strictEqual(latestCorrection.after_text, revisedText);
      assert.strictEqual(latestCorrection.reviewer_name, reviewer);
      assert.strictEqual(latestCorrection.reason, reason);
    });

    it('rejects human corrections when mandatory rationale is empty or whitespace', () => {
      const segments = SegmentRepo.getByRecordingId(testSessionId);
      assert.throws(() => {
        ReviewService.editSegmentText(segments[0].id, 'Changed text', 'Clerk', '');
      }, /Mandatory reason required/);

      assert.throws(() => {
        ReviewService.editSegmentText(segments[0].id, 'Changed text', 'Clerk', '   ');
      }, /Mandatory reason required/);
    });
  });

  describe('4. AI Review Suggestions & Evidence Quoting Guardrail', () => {
    it('runs AI review, filters candidate flags, and only retains verbatim quotes', async () => {
      const reviewResult = await ReviewService.triggerAiReview(testSessionId, true);
      assert.strictEqual(reviewResult.recording_id, testSessionId);
      assert.ok(reviewResult.flags.length > 0);
      assert.ok(reviewResult.flags_dropped >= 1, 'Hallucinated flag without verbatim quote was dropped');

      const flags = FlagRepo.getByRecordingId(testSessionId);
      assert.strictEqual(flags.length, reviewResult.flags.length);

      for (const flag of flags) {
        assert.strictEqual(flag.evidence_verified, 1);
        assert.ok(flag.evidence.length > 0);
      }
    });

    it('resolves flag decision with ACCEPT, DISMISS, or RETAIN', () => {
      const flags = FlagRepo.getByRecordingId(testSessionId);
      const flag = flags[0];

      const { flag: resolved } = ReviewService.decideFlag(
        flag.id,
        'ACCEPT',
        'Reviewer Otieno',
        'Accepted date amendment based on charge sheet',
        'CR 123/2026'
      );

      assert.strictEqual(resolved.status, 'RESOLVED');
      assert.strictEqual(resolved.resolved_by, 'Reviewer Otieno');
      assert.ok(resolved.resolved_at !== null);
    });
  });

  describe('5. Speaker Taxonomy Mapping Integration', () => {
    it('maps acoustic Speaker A to official MAGISTRATE role across all segments', () => {
      const mapping = ReviewService.assignSpeakerRole(
        testSessionId,
        'Speaker A',
        'MAGISTRATE',
        'Clerk Otieno',
        'Presiding judicial officer identified by call of court'
      );

      assert.strictEqual(mapping.role, 'MAGISTRATE');
      assert.strictEqual(mapping.speaker_label, 'Speaker A');

      // Verify speaker field in segment table was updated
      const segments = SegmentRepo.getByRecordingId(testSessionId);
      const speakerASegments = segments.filter((s) => s.speaker_label === 'Speaker A');
      assert.ok(speakerASegments.length > 0);
      for (const s of speakerASegments) {
        assert.strictEqual(s.speaker, 'MAGISTRATE');
      }

      // Verify role mapping table
      const storedRoles = RoleRepo.getByRecordingId(testSessionId);
      assert.ok(storedRoles.some((r) => r.speaker_label === 'Speaker A' && r.role === 'MAGISTRATE'));
    });
  });

  describe('6. Draft DOCX Document Generation & Audit Integration', () => {
    it('generates watermarked draft DOCX and persists export record with metrics', async () => {
      const { exportDoc, filePath } = await ExportService.generateDraftDocx(
        testSessionId,
        'Court Stenographer Amina'
      );

      assert.strictEqual(exportDoc.recording_id, testSessionId);
      assert.strictEqual(exportDoc.generated_by, 'Court Stenographer Amina');
      assert.ok(exportDoc.docx_filename.endsWith('.docx'));
      assert.ok(exportDoc.docx_filename.includes('HakiScribe_Draft_'));
      assert.ok(exportDoc.metrics);
      assert.ok(typeof exportDoc.metrics.ai_vs_reviewed.values.wer === 'number');

      // Check export table
      const latest = ExportRepo.getLatestByRecordingId(testSessionId);
      assert.ok(latest !== null);
      assert.strictEqual(latest?.id, exportDoc.id);

      // Verify audit event
      const events = AuditRepo.getEvents(testSessionId);
      assert.ok(events.some((e) => e.action === 'DRAFT_EXPORTED'));
    });
  });

  describe('7. Content-Free Deletion Logging Integration', () => {
    it('deletes session completely while preserving content-free deletion receipt', () => {
      SessionService.deleteSession(testSessionId, 'Registrar Kiprop', 'DELETE');

      // Session and related content must no longer exist
      const session = SessionRepo.getById(testSessionId);
      assert.strictEqual(session, null);

      const segments = SegmentRepo.getByRecordingId(testSessionId);
      assert.strictEqual(segments.length, 0);

      const flags = FlagRepo.getByRecordingId(testSessionId);
      assert.strictEqual(flags.length, 0);

      // Deletion receipt must be recorded
      const deletionRecords = db
        .prepare('SELECT * FROM deletion_log WHERE recording_id = ?')
        .all(testSessionId);
      assert.strictEqual(deletionRecords.length, 1);
      assert.strictEqual(deletionRecords[0].reviewer, 'Registrar Kiprop');
    });
  });
});
