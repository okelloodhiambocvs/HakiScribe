import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { db, initDatabase } from '../server/db/database';
import { SessionRepo } from '../server/db/repositories/sessionRepo';
import { SegmentRepo } from '../server/db/repositories/segmentRepo';
import { FlagRepo } from '../server/db/repositories/flagRepo';
import { CorrectionRepo } from '../server/db/repositories/correctionRepo';
import { RoleRepo } from '../server/db/repositories/roleRepo';
import { SessionService } from '../server/services/sessionService';
import { TranscriptionService } from '../server/services/transcriptionService';
import { ReviewService } from '../server/services/reviewService';
import { EvaluationService } from '../server/services/evaluationService';

describe('HakiScribe-AI Backend Test Suite', () => {
  before(() => {
    initDatabase();
  });

  describe('Database & Schema Integrity', () => {
    it('initializes required tables in SQLite', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((t: any) => t.name);

      assert.ok(tables.includes('recordings'), 'recordings table exists');
      assert.ok(tables.includes('segments'), 'segments table exists');
      assert.ok(tables.includes('flags'), 'flags table exists');
      assert.ok(tables.includes('corrections'), 'corrections table exists');
      assert.ok(tables.includes('speaker_roles'), 'speaker_roles table exists');
      assert.ok(tables.includes('deletion_log'), 'deletion_log table exists');
      assert.ok(tables.includes('audit_events'), 'audit_events table exists');
      assert.ok(tables.includes('api_calls'), 'api_calls table exists');
    });
  });

  describe('Session Lifecycle & Ingestion', () => {
    it('creates a recording session with synthetic attestation and SHA-256', () => {
      const session = SessionService.createSession({
        filename: 'synthetic-test-hearing.wav',
        storedPath: 'storage/uploads/synthetic-test-hearing.wav',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        sizeBytes: 10240,
        durationSec: 30.0,
        uploadedBy: 'Court Clerk Mwangi',
        syntheticAttestation: true,
      });

      assert.ok(session.id > 0, 'session has auto-increment ID');
      assert.strictEqual(session.filename, 'synthetic-test-hearing.wav');
      assert.strictEqual(session.uploaded_by, 'Court Clerk Mwangi');
      assert.strictEqual(session.status, 'UPLOADED');
    });

    it('rejects session creation without reviewer name or synthetic attestation', () => {
      assert.throws(() => {
        SessionService.createSession({
          filename: 'test.wav',
          storedPath: 'test.wav',
          sha256: 'abc',
          sizeBytes: 100,
          durationSec: 10,
          uploadedBy: '',
          syntheticAttestation: true,
        });
      }, /Reviewer name is required/);

      assert.throws(() => {
        SessionService.createSession({
          filename: 'test.wav',
          storedPath: 'test.wav',
          sha256: 'abc',
          sizeBytes: 100,
          durationSec: 10,
          uploadedBy: 'Clerk',
          syntheticAttestation: false,
        });
      }, /Synthetic attestation is strictly required/);
    });
  });

  describe('Transcription & Immutable Original Text', () => {
    it('transcribes session into diarized segments and preserves original text', async () => {
      const session = SessionService.loadDemoSession('Judicial Officer');
      const transcript = await TranscriptionService.transcribeSession(session.id, true);

      assert.strictEqual(transcript.recording_id, session.id);
      assert.ok(transcript.segments.length > 0, 'segments generated');
      assert.strictEqual(transcript.source, 'mock');

      const firstSeg = transcript.segments[0];
      assert.ok(firstSeg.text_original.length > 0);
      assert.strictEqual(firstSeg.text_current, firstSeg.text_original);
      assert.strictEqual(firstSeg.confidence, null, 'confidence is NULL per Meta Voice Transcribe API');
    });
  });

  describe('Human Review & Traceable Corrections', () => {
    it('applies text edit with mandatory reason and writes append-only correction log', async () => {
      const session = SessionService.loadDemoSession('Reviewer Kamau');
      const transcript = await TranscriptionService.transcribeSession(session.id, true);
      const seg = transcript.segments[0];

      const newText = 'Court is now in session. Case number CR 123/2026.';
      const editReason = 'Standardised court slash notation for case number.';

      const { segment: updatedSeg, correction } = ReviewService.editSegmentText(
        seg.id,
        newText,
        'Reviewer Kamau',
        editReason
      );

      assert.strictEqual(updatedSeg.text_current, newText);
      assert.strictEqual(updatedSeg.text_original, seg.text_original, 'original text is preserved untouched');
      assert.strictEqual(correction.before_text, seg.text_original);
      assert.strictEqual(correction.after_text, newText);
      assert.strictEqual(correction.reviewer_name, 'Reviewer Kamau');
      assert.strictEqual(correction.reason, editReason);
    });

    it('rejects text edit when reason is missing', () => {
      assert.throws(() => {
        ReviewService.editSegmentText(1, 'Modified text', 'Reviewer', '');
      }, /Mandatory reason required/);
    });
  });

  describe('AI Review & Evidence Quoting Guardrail', () => {
    it('drops hallucinated flags that do not quote transcript verbatim', async () => {
      const session = SessionService.loadDemoSession('Auditor');
      await TranscriptionService.transcribeSession(session.id, true);

      const review = await ReviewService.triggerAiReview(session.id, true);
      assert.ok(review.flags.length > 0, 'verified flags created');
      assert.ok(review.flags_dropped >= 1, 'at least 1 hallucinated flag was dropped by guardrail');

      for (const flag of review.flags) {
        assert.strictEqual(flag.evidence_verified, 1);
        assert.ok(flag.evidence.length > 0);
      }
    });

    it('allows deciding flag as ACCEPT, DISMISS, or RETAIN', async () => {
      const session = SessionService.loadDemoSession('Auditor');
      await TranscriptionService.transcribeSession(session.id, true);
      const review = await ReviewService.triggerAiReview(session.id, true);
      const firstFlag = review.flags[0];

      const { flag: resolved } = ReviewService.decideFlag(
        firstFlag.id,
        'RETAIN',
        'Auditor',
        'Retained as uncertain pending next court mention'
      );

      assert.strictEqual(resolved.status, 'RETAINED');
      assert.strictEqual(resolved.resolved_by, 'Auditor');
      assert.strictEqual(resolved.reason, 'Retained as uncertain pending next court mention');
    });
  });

  describe('Speaker Taxonomy Role Assignment', () => {
    it('assigns locked taxonomy court role across all matching segments', async () => {
      const session = SessionService.loadDemoSession('Senior Clerk');
      await TranscriptionService.transcribeSession(session.id, true);

      const mapping = ReviewService.assignSpeakerRole(
        session.id,
        'Speaker A',
        'MAGISTRATE',
        'Senior Clerk',
        'Presiding judicial officer ruling'
      );

      assert.strictEqual(mapping.role, 'MAGISTRATE');
      assert.strictEqual(mapping.speaker_label, 'Speaker A');

      const segments = SegmentRepo.getByRecordingId(session.id);
      const speakerASegments = segments.filter((s) => s.speaker_label === 'Speaker A');
      for (const seg of speakerASegments) {
        assert.strictEqual(seg.speaker, 'MAGISTRATE');
      }
    });
  });

  describe('Evaluation Mathematical Accuracy (WER/CER)', () => {
    it('normalises text removing punctuation/symbols while preserving diacritics', () => {
      const input = 'Mheshimiwa, Case No. 123! — "Dhamana"   entered.';
      const normalised = EvaluationService.normaliseText(input);
      assert.strictEqual(normalised, 'mheshimiwa case no 123 dhamana entered');
    });

    it('computes exact Levenshtein WER and CER', () => {
      const ref = 'Court is in session';
      const hyp = 'Court is now in session';
      const { wer, cer } = EvaluationService.computeWerCer(ref, hyp);

      assert.strictEqual(wer, 0.25); // 1 insertion out of 4 reference words = 25%
      assert.ok(cer > 0 && cer < 1);
    });
  });

  describe('Content-Free Deletion Logging', () => {
    it('permanently deletes session and writes content-free deletion log', () => {
      const session = SessionService.createSession({
        filename: 'delete-me.wav',
        storedPath: 'storage/uploads/delete-me.wav',
        sha256: 'deadbeef',
        sizeBytes: 500,
        durationSec: 5,
        uploadedBy: 'Clerk',
        syntheticAttestation: true,
      });

      SessionService.deleteSession(session.id, 'Clerk', 'DELETE');

      const queried = SessionRepo.getById(session.id);
      assert.strictEqual(queried, null, 'session was completely deleted');

      const logs = db.prepare('SELECT * FROM deletion_log WHERE recording_id = ?').all(session.id);
      assert.strictEqual(logs.length, 1, 'deletion receipt created');
      assert.strictEqual(logs[0].reviewer, 'Clerk');
    });
  });
});
