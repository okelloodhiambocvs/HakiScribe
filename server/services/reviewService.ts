import {
  AIReviewResult,
  FlagStatus,
  ReviewFlag,
  SpeakerRole,
  SpeakerRoleMapping,
  TranscriptCorrection,
  TranscriptSegment,
} from '../../shared/types';
import { TAXONOMY_ROLES } from '../../shared/taxonomy';
import { SegmentRepo } from '../db/repositories/segmentRepo';
import { FlagRepo } from '../db/repositories/flagRepo';
import { CorrectionRepo } from '../db/repositories/correctionRepo';
import { RoleRepo } from '../db/repositories/roleRepo';
import { ParticipantRepo } from '../db/repositories/participantRepo';
import { AuditRepo } from '../db/repositories/auditRepo';
import { runSparkReview } from '../integrations/meta/sparkReview';
import { META_API_CONFIG } from '../integrations/meta/metaClient';

export interface SpeakerAssignmentOptions {
  participantId?: number | null;
  confirmed?: boolean;
}

export class ReviewService {
  static async triggerAiReview(recordingId: number, forceMock = false): Promise<AIReviewResult> {
    const segments = SegmentRepo.getByRecordingId(recordingId);
    if (segments.length === 0) {
      throw new Error(`Cannot run review on recording #${recordingId}: No transcript segments found.`);
    }

    // Check if flags already exist
    const existing = FlagRepo.getByRecordingId(recordingId);
    if (existing.length > 0) {
      return {
        recording_id: recordingId,
        model: META_API_CONFIG.sparkModel,
        flags_created: existing.length,
        flags_dropped: 0,
        flags: existing,
        created_at: existing[0].created_at,
      };
    }

    const reviewResult = await runSparkReview(recordingId, segments, forceMock);
    const inserted = FlagRepo.bulkInsert(reviewResult.flags);

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: 'Muse Spark Reviewer',
      action: 'AI_REVIEW_COMPLETED',
      details: `Generated ${inserted.length} verified review flags; dropped ${reviewResult.flagsDropped} unquoted candidates`,
      timestamp: new Date().toISOString(),
    });

    return {
      recording_id: recordingId,
      model: reviewResult.model,
      flags_created: inserted.length,
      flags_dropped: reviewResult.flagsDropped,
      flags: inserted,
      created_at: new Date().toISOString(),
    };
  }

  static getFlags(recordingId: number): ReviewFlag[] {
    return FlagRepo.getByRecordingId(recordingId);
  }

  static editSegmentText(
    segmentId: number,
    newText: string,
    reviewer: string,
    reason: string
  ): { segment: TranscriptSegment; correction: TranscriptCorrection } {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to authenticate transcript modification.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory reason required for every judicial transcript edit.');
    }

    const segment = SegmentRepo.getById(segmentId);
    if (!segment) {
      throw new Error(`Transcript segment #${segmentId} not found.`);
    }

    const beforeText = segment.text_current;
    if (beforeText === newText.trim()) {
      throw new Error('No modifications detected between current text and submission.');
    }

    SegmentRepo.updateText(segmentId, newText.trim());

    const now = new Date().toISOString();
    const correction = CorrectionRepo.create({
      recording_id: segment.recording_id,
      segment_id: segmentId,
      field: 'text_current',
      before_text: beforeText,
      after_text: newText.trim(),
      reviewer_name: reviewer.trim(),
      decision: 'human_text_edit',
      reason: reason.trim(),
      created_at: now,
    });

    AuditRepo.logEvent({
      recording_id: segment.recording_id,
      actor: reviewer.trim(),
      action: 'SEGMENT_EDITED',
      details: `Edited segment #${segment.idx} (Reason: ${reason.trim()})`,
      timestamp: now,
    });

    const updated = SegmentRepo.getById(segmentId)!;
    return { segment: updated, correction };
  }

  static decideFlag(
    flagId: number,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    reviewer: string,
    reason: string,
    replacementText?: string
  ): { flag: ReviewFlag; segment?: TranscriptSegment; correction?: TranscriptCorrection } {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to record flag decision.');
    }

    const flag = FlagRepo.getById(flagId);
    if (!flag) {
      throw new Error(`Review flag #${flagId} not found.`);
    }

    const newStatus: FlagStatus =
      decision === 'ACCEPT' ? 'RESOLVED' : decision === 'DISMISS' ? 'DISMISSED' : 'RETAINED';

    const finalReason = reason && reason.trim() ? reason.trim() : `Decision: ${decision}`;

    FlagRepo.resolve(flagId, newStatus, reviewer.trim(), finalReason);

    let updatedSegment: TranscriptSegment | undefined;
    let newCorrection: TranscriptCorrection | undefined;

    // If accepting suggestion with text replacement
    if (decision === 'ACCEPT' && replacementText) {
      const seg = SegmentRepo.getById(flag.segment_id);
      if (seg) {
        const beforeText = seg.text_current;
        const newText = seg.text_current.replace(flag.evidence, replacementText.trim());
        SegmentRepo.updateText(seg.id, newText);

        newCorrection = CorrectionRepo.create({
          recording_id: flag.recording_id,
          segment_id: seg.id,
          field: 'text_current',
          before_text: beforeText,
          after_text: newText,
          reviewer_name: reviewer.trim(),
          decision: 'accept_suggestion',
          reason: `Accepted AI flag suggestion: ${flag.suggestion}`,
          created_at: new Date().toISOString(),
        });
        updatedSegment = SegmentRepo.getById(seg.id)!;
      }
    }

    const updatedFlag = FlagRepo.getById(flagId)!;
    return { flag: updatedFlag, segment: updatedSegment, correction: newCorrection };
  }

  static assignSpeakerRole(
    recordingId: number,
    speakerLabel: string,
    role: SpeakerRole,
    reviewer: string,
    reason?: string,
    options?: SpeakerAssignmentOptions
  ): SpeakerRoleMapping {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to assign court speaker roles.');
    }
    if (!TAXONOMY_ROLES.includes(role)) {
      throw new Error(`Invalid speaker role '${role}'. Must be one of locked taxonomy.`);
    }

    // Participant-linked assignments require a registered participant from the SAME
    // proceeding plus explicit reviewer confirmation. AI paths never supply these.
    const participantId = options && options.participantId ? options.participantId : null;
    let participantName: string | null = null;
    if (participantId !== null) {
      if (!options || options.confirmed !== true) {
        throw new Error('Explicit reviewer confirmation is required to assign a speaker to a participant.');
      }
      const participant = ParticipantRepo.getById(participantId);
      if (!participant || participant.recording_id !== recordingId) {
        throw new Error(
          `Participant #${participantId} is not registered in recording #${recordingId}.`
        );
      }
      if (participant.role !== role) {
        throw new Error(
          `Role mismatch: participant ${participant.full_name} is registered as ${participant.role}, not ${role}.`
        );
      }
      participantName = participant.full_name;
    }

    const previous = RoleRepo.getByRecordingId(recordingId).find(
      (m) => m.speaker_label === speakerLabel
    );

    const now = new Date().toISOString();
    const mapping: SpeakerRoleMapping = {
      recording_id: recordingId,
      speaker_label: speakerLabel,
      role,
      assigned_by: reviewer.trim(),
      assigned_at: now,
      reason: reason ? reason.trim() : null,
      participant_id: participantId,
      participant_name: participantName,
    };

    RoleRepo.upsert(mapping);
    SegmentRepo.updateSpeakerRoleForLabel(recordingId, speakerLabel, role);

    const beforeDesc = previous
      ? `'${previous.speaker_label}' was ${previous.participant_name || previous.role}`
      : 'no previous mapping';
    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'SPEAKER_ROLE_ASSIGNED',
      details: `Mapped speaker label '${speakerLabel}' to ${participantName ? `${participantName} (${role})` : `court role '${role}'`} (Reason: ${reason || 'Taxonomy alignment'}). Previous: ${beforeDesc}.`,
      timestamp: now,
    });

    return mapping;
  }

  static unassignSpeakerRole(
    recordingId: number,
    speakerLabel: string,
    reviewer: string,
    reason?: string
  ): void {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to clear a speaker assignment.');
    }

    const previous = RoleRepo.getByRecordingId(recordingId).find(
      (m) => m.speaker_label === speakerLabel
    );

    RoleRepo.deleteMapping(recordingId, speakerLabel);
    SegmentRepo.resetSpeakerForLabel(recordingId, speakerLabel);

    const now = new Date().toISOString();
    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'SPEAKER_UNASSIGNED',
      details: `Cleared speaker label '${speakerLabel}' back to unidentified (Reason: ${reason || 'Reverted by reviewer'}). Previous: ${previous ? previous.participant_name || previous.role : 'none'}.`,
      timestamp: now,
    });
  }

  static getCorrections(recordingId: number): TranscriptCorrection[] {
    return CorrectionRepo.getByRecordingId(recordingId);
  }

  static getSpeakerRoles(recordingId: number): SpeakerRoleMapping[] {
    return RoleRepo.getByRecordingId(recordingId);
  }
}
