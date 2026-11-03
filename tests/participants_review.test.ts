import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { db, initDatabase } from '../server/db/database';
import { SegmentRepo } from '../server/db/repositories/segmentRepo';
import { FlagRepo } from '../server/db/repositories/flagRepo';
import { RoleRepo } from '../server/db/repositories/roleRepo';
import { ParticipantRepo } from '../server/db/repositories/participantRepo';
import { AuditRepo } from '../server/db/repositories/auditRepo';
import { SessionService } from '../server/services/sessionService';
import { TranscriptionService } from '../server/services/transcriptionService';
import { ReviewService } from '../server/services/reviewService';
import { ParticipantService } from '../server/services/participantService';
import { runSparkReview } from '../server/integrations/meta/sparkReview';
import { TAXONOMY_ROLES, ROLE_DISPLAY_LABELS } from '../shared/taxonomy';
import {
  UNIDENTIFIED_HEADING,
  formatParticipantHeading,
  resolveSegmentSpeaker,
} from '../shared/participants';
import { computeReviewState } from '../shared/reviewState';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('Participant Identification & Review-State Suite', () => {
  before(() => {
    initDatabase();
  });

  describe('Courtroom Taxonomy', () => {
    it('supports the required Kenyan courtroom roles with display labels', () => {
      for (const role of ['JUDGE', 'MAGISTRATE', 'PROSECUTOR', 'ADVOCATE', 'WITNESS', 'ACCUSED', 'COMPLAINANT'] as const) {
        assert.ok((TAXONOMY_ROLES as string[]).includes(role), `${role} is supported`);
        assert.ok(ROLE_DISPLAY_LABELS[role].length > 0);
      }
      assert.strictEqual(ROLE_DISPLAY_LABELS['ADVOCATE'], 'Defence Advocate');
      assert.strictEqual(ROLE_DISPLAY_LABELS['ACCUSED'], 'Accused Person');
    });

    it('retains existing support roles and the unidentified fallback', () => {
      for (const role of ['COURT_ASSISTANT', 'INVESTIGATING_OFFICER', 'INTERPRETER', 'WITNESS_PW1', 'WITNESS_PW2', 'UNKNOWN'] as const) {
        assert.ok((TAXONOMY_ROLES as string[]).includes(role), `${role} is retained`);
      }
    });
  });

  describe('Participant Registration', () => {
    it('registers a participant with full name and courtroom role', () => {
      const session = SessionService.loadDemoSession('Registrar Test');
      const participant = ParticipantService.registerParticipant(
        session.id,
        'Jane Wanjiku',
        'WITNESS',
        'Registrar Test',
        'PW1',
        'Neighbour witness'
      );

      assert.ok(participant.id > 0);
      assert.strictEqual(participant.recording_id, session.id);
      assert.strictEqual(participant.full_name, 'Jane Wanjiku');
      assert.strictEqual(participant.role, 'WITNESS');
      assert.strictEqual(participant.witness_designation, 'PW1');
      assert.strictEqual(participant.verified, 0, 'new registrations start unverified');
    });

    it('allows multiple participants to share a role', () => {
      const session = SessionService.loadDemoSession('Registrar Test');
      const first = ParticipantService.registerParticipant(session.id, 'Witness One', 'WITNESS', 'Registrar Test', 'PW1');
      const second = ParticipantService.registerParticipant(session.id, 'Witness Two', 'WITNESS', 'Registrar Test', 'PW2');
      const third = ParticipantService.registerParticipant(session.id, 'Counsel A', 'ADVOCATE', 'Registrar Test');
      const fourth = ParticipantService.registerParticipant(session.id, 'Counsel B', 'ADVOCATE', 'Registrar Test');

      assert.notStrictEqual(first.id, second.id);
      assert.notStrictEqual(third.id, fourth.id);
      const listed = ParticipantService.listParticipants(session.id);
      assert.ok(listed.length >= 4);
    });

    it('rejects empty names, invalid roles, UNKNOWN role, and bad designations', () => {
      const session = SessionService.loadDemoSession('Registrar Test');
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, '   ', 'WITNESS', 'Registrar Test');
      }, /full name is required/);
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, 'Nobody', 'NOT_A_ROLE' as any, 'Registrar Test');
      }, /Invalid participant role/);
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, 'Nobody', 'UNKNOWN', 'Registrar Test');
      }, /concrete courtroom role/);
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, 'Jane', 'WITNESS', 'Registrar Test', 'PX9');
      }, /Invalid witness designation/);
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, 'John', 'PROSECUTOR', 'Registrar Test', 'PW1');
      }, /Witness role/);
      assert.throws(() => {
        ParticipantService.registerParticipant(session.id, 'Jane', 'WITNESS', '   ');
      }, /Reviewer name is required/);
    });

    it('verifies participant identity only with a named reviewer and matching proceeding', () => {
      const session = SessionService.loadDemoSession('Registrar Test');
      const other = SessionService.loadDemoSession('Registrar Test');
      const participant = ParticipantService.registerParticipant(session.id, 'Mary Achieng', 'MAGISTRATE', 'Registrar Test');

      assert.throws(() => {
        ParticipantService.verifyParticipant(session.id, participant.id, '   ');
      }, /Reviewer name is required/);
      assert.throws(() => {
        ParticipantService.verifyParticipant(other.id, participant.id, 'Registrar Test');
      }, /not found in recording/);

      const verified = ParticipantService.verifyParticipant(session.id, participant.id, 'Senior Clerk');
      assert.strictEqual(verified.verified, 1);
      assert.strictEqual(verified.verified_by, 'Senior Clerk');
    });
  });

  describe('Speaker-to-Participant Assignment', () => {
    it('assigns a diarized voice to a verified participant consistently across turns', async () => {
      const session = SessionService.loadDemoSession('Reviewer Assign');
      await TranscriptionService.transcribeSession(session.id, true);
      const participant = ParticipantService.registerParticipant(session.id, 'John Otieno', 'PROSECUTOR', 'Reviewer Assign');
      ParticipantService.verifyParticipant(session.id, participant.id, 'Reviewer Assign');

      const mapping = ReviewService.assignSpeakerRole(
        session.id,
        'Speaker C',
        'PROSECUTOR',
        'Reviewer Assign',
        'Read the charge sheet',
        { participantId: participant.id, confirmed: true }
      );

      assert.strictEqual(mapping.participant_id, participant.id);
      assert.strictEqual(mapping.participant_name, 'John Otieno');

      const segments = SegmentRepo.getByRecordingId(session.id);
      const speakerC = segments.filter((s) => s.speaker_label === 'Speaker C');
      assert.ok(speakerC.length > 1, 'Speaker C has multiple turns');
      for (const seg of speakerC) {
        assert.strictEqual(seg.speaker, 'PROSECUTOR');
      }

      const roles = RoleRepo.getByRecordingId(session.id);
      const names = ParticipantRepo.getByRecordingId(session.id);
      for (const seg of speakerC) {
        const resolved = resolveSegmentSpeaker(seg.speaker_label, roles, names);
        assert.strictEqual(resolved.identified, true);
        assert.strictEqual(resolved.heading, 'JOHN OTIENO â€” PROSECUTOR');
      }
    });

    it('requires explicit confirmation and rejects cross-proceeding participants', async () => {
      const session = SessionService.loadDemoSession('Reviewer Scope');
      const other = SessionService.loadDemoSession('Reviewer Scope');
      await TranscriptionService.transcribeSession(session.id, true);
      const participant = ParticipantService.registerParticipant(session.id, 'Jane Wanjiku', 'WITNESS', 'Reviewer Scope', 'PW1');
      const foreign = ParticipantService.registerParticipant(other.id, 'Foreign Person', 'WITNESS', 'Reviewer Scope', 'PW1');

      assert.throws(() => {
        ReviewService.assignSpeakerRole(session.id, 'Speaker F', 'WITNESS', 'Reviewer Scope', undefined, {
          participantId: participant.id,
          confirmed: false,
        });
      }, /Explicit reviewer confirmation is required/);

      assert.throws(() => {
        ReviewService.assignSpeakerRole(session.id, 'Speaker F', 'WITNESS', 'Reviewer Scope', undefined, {
          participantId: foreign.id,
          confirmed: true,
        });
      }, /not registered in recording/);

      assert.throws(() => {
        ReviewService.assignSpeakerRole(session.id, 'Speaker F', 'PROSECUTOR', 'Reviewer Scope', undefined, {
          participantId: participant.id,
          confirmed: true,
        });
      }, /Role mismatch/);
    });

    it('keeps unverified voices visibly unidentified and supports clearing assignments', async () => {
      const session = SessionService.loadDemoSession('Reviewer Clear');
      await TranscriptionService.transcribeSession(session.id, true);

      const roles = RoleRepo.getByRecordingId(session.id);
      const names = ParticipantRepo.getByRecordingId(session.id);
      assert.strictEqual(resolveSegmentSpeaker('Speaker A', roles, names).heading, UNIDENTIFIED_HEADING);
      assert.strictEqual(resolveSegmentSpeaker('Speaker A', roles, names).identified, false);

      const participant = ParticipantService.registerParticipant(session.id, 'Peter Kamau', 'ACCUSED', 'Reviewer Clear');
      ReviewService.assignSpeakerRole(session.id, 'Speaker D', 'ACCUSED', 'Reviewer Clear', undefined, {
        participantId: participant.id,
        confirmed: true,
      });

      let current = resolveSegmentSpeaker(
        'Speaker D',
        RoleRepo.getByRecordingId(session.id),
        ParticipantRepo.getByRecordingId(session.id)
      );
      assert.strictEqual(current.identified, false, 'unverified participant stays unresolved');
      assert.ok(current.heading.includes('UNVERIFIED'));

      ReviewService.unassignSpeakerRole(session.id, 'Speaker D', 'Reviewer Clear');
      current = resolveSegmentSpeaker(
        'Speaker D',
        RoleRepo.getByRecordingId(session.id),
        ParticipantRepo.getByRecordingId(session.id)
      );
      assert.strictEqual(current.heading, UNIDENTIFIED_HEADING);
      const segments = SegmentRepo.getByRecordingId(session.id).filter((s) => s.speaker_label === 'Speaker D');
      for (const seg of segments) {
        assert.strictEqual(seg.speaker, 'Speaker D', 'acoustic label restored');
      }
    });

    it('keeps legacy role-only assignments and sessions usable', async () => {
      const session = SessionService.loadDemoSession('Legacy Clerk');
      await TranscriptionService.transcribeSession(session.id, true);

      const mapping = ReviewService.assignSpeakerRole(session.id, 'Speaker A', 'MAGISTRATE', 'Legacy Clerk');
      assert.strictEqual(mapping.role, 'MAGISTRATE');
      assert.strictEqual(mapping.participant_id, null);

      const resolved = resolveSegmentSpeaker(
        'Speaker A',
        RoleRepo.getByRecordingId(session.id),
        ParticipantRepo.getByRecordingId(session.id)
      );
      assert.strictEqual(resolved.identified, false);
      assert.ok(resolved.heading.includes('MAGISTRATE'));
      assert.ok(resolved.heading.includes('IDENTIFICATION REQUIRED'));
    });

    it('records participant and assignment decisions in the audit trail', () => {
      const session = SessionService.loadDemoSession('Auditor Trail');
      const participant = ParticipantService.registerParticipant(session.id, 'Grace Akinyi', 'COMPLAINANT', 'Auditor Trail');
      ParticipantService.verifyParticipant(session.id, participant.id, 'Auditor Trail');

      const events = AuditRepo.getEvents(session.id);
      assert.ok(events.some((e) => e.action === 'PARTICIPANT_REGISTERED'));
      assert.ok(events.some((e) => e.action === 'PARTICIPANT_VERIFIED'));
    });

    it('removes participants with their proceeding and never leaks mappings across proceedings', async () => {
      const first = SessionService.loadDemoSession('Registrar Leak');
      const second = SessionService.loadDemoSession('Registrar Leak');
      await TranscriptionService.transcribeSession(first.id, true);
      await TranscriptionService.transcribeSession(second.id, true);

      const participant = ParticipantService.registerParticipant(first.id, 'Scoped Person', 'WITNESS', 'Registrar Leak', 'PW1');
      ReviewService.assignSpeakerRole(first.id, 'Speaker F', 'WITNESS', 'Registrar Leak', undefined, {
        participantId: participant.id,
        confirmed: true,
      });

      assert.strictEqual(ParticipantRepo.getByRecordingId(second.id).length, 0);
      assert.strictEqual(RoleRepo.getByRecordingId(second.id).length, 0);

      SessionService.deleteSession(first.id, 'Registrar Leak', 'DELETE');
      assert.strictEqual(ParticipantRepo.getByRecordingId(first.id).length, 0);
      assert.strictEqual(RoleRepo.getByRecordingId(first.id).length, 0);
    });
  });

  describe('AI Identity Safeguards', () => {
    it('never lets review AI invent participant identities', async () => {
      const session = SessionService.loadDemoSession('Auditor AI');
      const transcript = await TranscriptionService.transcribeSession(session.id, true);

      const spark = await runSparkReview(session.id, transcript.segments, true);
      for (const flag of spark.flags) {
        const keys = Object.keys(flag);
        assert.ok(!keys.includes('participant_id'), 'flags carry no participant linkage');
        assert.ok(!keys.includes('participant_name'), 'flags carry no invented names');
        assert.strictEqual(flag.resolved_by, null, 'AI output is never pre-resolved');
      }

      const review = await ReviewService.triggerAiReview(session.id, true);
      const stored = FlagRepo.getByRecordingId(session.id);
      assert.strictEqual(stored.length, review.flags.length);
      for (const flag of stored) {
        assert.strictEqual(flag.resolved_by, null);
      }

      assert.throws(() => {
        ReviewService.assignSpeakerRole(session.id, 'Speaker A', 'MAGISTRATE', '   ');
      }, /Reviewer name is required/);
    });
  });

  describe('Transcript Heading Presentation', () => {
    it('formats verified participant headings with name, role, and designation', () => {
      assert.strictEqual(
        formatParticipantHeading({
          id: 1,
          recording_id: 1,
          full_name: 'Mary Achieng',
          role: 'MAGISTRATE',
          witness_designation: null,
          description: null,
          verified: 1,
          verified_by: 'Clerk',
          verified_at: '2026-11-03T00:00:00Z',
          created_by: 'Clerk',
          created_at: '2026-11-03T00:00:00Z',
        }),
        'MARY ACHIENG â€” MAGISTRATE'
      );
      assert.strictEqual(
        formatParticipantHeading({
          id: 2,
          recording_id: 1,
          full_name: 'Jane Wanjiku',
          role: 'WITNESS',
          witness_designation: 'PW1',
          description: null,
          verified: 1,
          verified_by: 'Clerk',
          verified_at: '2026-11-03T00:00:00Z',
          created_by: 'Clerk',
          created_at: '2026-11-03T00:00:00Z',
        }),
        'JANE WANJIKU â€” WITNESS (PW1)'
      );
    });
  });

  describe('Red/Green Review States', () => {
    const baseInput = {
      segmentId: 1,
      segmentIdx: 0,
      textCurrent: 'Court is now in session.',
      confidence: null as number | null,
      flags: [] as any[],
      corrections: [] as any[],
      speakerIdentified: true,
      speakerIdentityReason: null as string | null,
    };

    it('marks unidentified speakers as needing review with a visible reason', () => {
      const state = computeReviewState({ ...baseInput, speakerIdentified: false, speakerIdentityReason: 'Speaker identity not verified.' });
      assert.strictEqual(state.status, 'NEEDS_REVIEW');
      assert.strictEqual(state.statusLabel, 'NEEDS REVIEW');
      assert.ok(state.reasons.some((r) => r.includes('Speaker identity not verified')));
    });

    it('marks open and retained flags as needing review', () => {
      const open = computeReviewState({
        ...baseInput,
        flags: [{ id: 1, segment_id: 1, flag_type: 'LEGAL_TERM', severity: 'MEDIUM', message: 'Check section.', status: 'OPEN', resolved_by: null }],
      });
      assert.strictEqual(open.status, 'NEEDS_REVIEW');
      assert.ok(open.reasons[0].includes('Check section.'));

      const retained = computeReviewState({
        ...baseInput,
        flags: [{ id: 1, segment_id: 1, flag_type: 'LEGAL_TERM', severity: 'MEDIUM', message: 'Check section.', status: 'RETAINED', resolved_by: null }],
      });
      assert.strictEqual(retained.status, 'NEEDS_REVIEW');
    });

    it('uses only genuine evidence for uncertainty: real confidence and unclear markers', () => {
      const lowConfidence = computeReviewState({ ...baseInput, confidence: 0.42 });
      assert.strictEqual(lowConfidence.status, 'NEEDS_REVIEW');
      assert.ok(lowConfidence.reasons.some((r) => r.includes('0.42')));

      const nullConfidence = computeReviewState({ ...baseInput, confidence: null });
      assert.strictEqual(nullConfidence.status, 'CLEARED', 'NULL Voice API confidence is not penalised');

      const unclear = computeReviewState({ ...baseInput, textCurrent: 'The witness said [inaudible] then left.' });
      assert.strictEqual(unclear.status, 'NEEDS_REVIEW');
      assert.ok(unclear.reasons.some((r) => r.includes('unclear or inaudible')));
    });

    it('distinguishes human-verified passages from automatically clear ones', () => {
      const untouched = computeReviewState(baseInput);
      assert.strictEqual(untouched.status, 'CLEARED');
      assert.strictEqual(untouched.verifiedByHuman, false);
      assert.strictEqual(untouched.statusLabel, 'CLEARED â€” NO ISSUES DETECTED');

      const corrected = computeReviewState({
        ...baseInput,
        corrections: [{ reviewer_name: 'Reviewer Kamau' }],
      });
      assert.strictEqual(corrected.verifiedByHuman, true);
      assert.strictEqual(corrected.statusLabel, 'CLEARED â€” HUMAN VERIFIED');

      const decided = computeReviewState({
        ...baseInput,
        flags: [{ id: 1, segment_id: 1, flag_type: 'LEGAL_TERM', severity: 'MEDIUM', message: 'Checked.', status: 'RESOLVED', resolved_by: 'Reviewer Kamau' }],
      });
      assert.strictEqual(decided.status, 'CLEARED');
      assert.strictEqual(decided.verifiedByHuman, true);
    });

    it('never lets AI suggestions alone mark a passage as human-verified', () => {
      const aiOnly = computeReviewState({
        ...baseInput,
        flags: [{ id: 1, segment_id: 1, flag_type: 'LEGAL_TERM', severity: 'LOW', message: 'Suggestion pending.', status: 'OPEN', resolved_by: null }],
      });
      assert.strictEqual(aiOnly.status, 'NEEDS_REVIEW');
      assert.strictEqual(aiOnly.verifiedByHuman, false);
    });
  });

  describe('Correction Ledger Integrity', () => {
    it('preserves original text and mandatory reasons after participant changes', async () => {
      const session = SessionService.loadDemoSession('Reviewer Ledger');
      const transcript = await TranscriptionService.transcribeSession(session.id, true);
      const seg = transcript.segments[0];

      const { segment: updated, correction } = ReviewService.editSegmentText(
        seg.id,
        'Court is now in session. Case number CR 123/2026.',
        'Reviewer Ledger',
        'Standardised case number notation.'
      );

      assert.strictEqual(updated.text_original, seg.text_original);
      assert.strictEqual(correction.before_text, seg.text_original);
      assert.throws(() => {
        ReviewService.editSegmentText(seg.id, 'Other text', 'Reviewer Ledger', '  ');
      }, /Mandatory reason required/);
    });
  });

  describe('Database Schema', () => {
    it('creates the participants table with proceeding-scoped cascade', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((t: any) => t.name);
      assert.ok(tables.includes('participants'), 'participants table exists');

      const columns = db.prepare(`PRAGMA table_info(speaker_roles)`).all() as Array<{ name: string }>;
      const names = columns.map((c) => c.name);
      assert.ok(names.includes('participant_id'));
      assert.ok(names.includes('participant_name'));
    });
  });

  describe('Frontend Navigation Regression Guards', () => {
    it('removes System & Audit Status from the sidebar while keeping main navigation', () => {
      const sidebar = readSource('src/components/Sidebar.tsx');
      assert.ok(!sidebar.includes('System & Audit Status'), 'diagnostics entry removed from sidebar');
      assert.ok(!sidebar.includes('onOpenDiagnostics'), 'diagnostics handler removed from sidebar');
      for (const label of ['Dashboard', 'Audio Ingestion', 'Live Microphone', 'Transcription', 'Review Desk', 'Draft Export', 'Session Archive']) {
        assert.ok(sidebar.includes(label), `sidebar keeps ${label}`);
      }
      assert.ok(sidebar.includes('About Us'), 'sidebar footer keeps About Us');
      assert.ok(sidebar.includes('How It Works'), 'sidebar footer keeps How It Works');
    });

    it('removes duplicated footer links while keeping the legal disclaimer', () => {
      const footer = readSource('src/components/Footer.tsx');
      assert.ok(!footer.includes('About Us'), 'footer no longer duplicates About Us');
      assert.ok(!footer.includes('How It Works'), 'footer no longer duplicates How It Works');
      assert.ok(footer.includes('FOOTER_DISCLAIMER'), 'footer keeps the legal disclaimer');
    });

    it('removes the raw AI review button from the ordinary reviewer toolbar', () => {
      const reviewView = readSource('src/views/ReviewView.tsx');
      assert.ok(!reviewView.includes('Run AI Review (Spark)'), 'raw AI control removed from review desk');
      assert.ok(reviewView.includes('ParticipantRegistry'), 'review desk hosts the participant register');
      assert.ok(reviewView.includes('SpeakerParticipantAssigner'), 'review desk hosts identity assignment');
    });
  });
});
