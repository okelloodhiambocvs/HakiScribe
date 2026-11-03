import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { ParticipantService } from '../services/participantService';
import { AIReviewResult, ApiResponse, CourtParticipant, ReviewFlag, SpeakerRoleMapping } from '../../shared/types';
import { parseIdParam } from '../utils/params';

export class ReviewController {
  static async triggerReview(req: Request, res: Response<ApiResponse<AIReviewResult>>): Promise<void> {
    try {
      const recordingId = parseIdParam(req.params.id);
      const forceMock = req.body.forceMock === true || req.body.forceMock === 'true';

      const result = await ReviewService.triggerAiReview(recordingId, forceMock);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'REVIEW_FAILED', message: err.message } });
    }
  }

  static getFlags(req: Request, res: Response<ApiResponse<ReviewFlag[]>>): void {
    const recordingId = parseIdParam(req.params.id);
    const flags = ReviewService.getFlags(recordingId);
    res.json({ success: true, data: flags });
  }

  static decideFlag(req: Request, res: Response<ApiResponse<any>>): void {
    try {
      const flagId = parseIdParam(req.params.flagId);
      const { decision, reviewer, reason, replacementText } = req.body;

      const result = ReviewService.decideFlag(flagId, decision, reviewer, reason, replacementText);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'FLAG_DECISION_FAILED', message: err.message } });
    }
  }

  static assignRole(req: Request, res: Response<ApiResponse<SpeakerRoleMapping>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const { speakerLabel, role, reviewer, reason, participantId, confirmed } = req.body;

      const mapping = ReviewService.assignSpeakerRole(recordingId, speakerLabel, role, reviewer, reason, {
        participantId: participantId === null || participantId === undefined ? null : Number(participantId),
        confirmed: confirmed === true,
      });
      res.json({ success: true, data: mapping });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ROLE_ASSIGN_FAILED', message: err.message } });
    }
  }

  static getRoles(req: Request, res: Response<ApiResponse<SpeakerRoleMapping[]>>): void {
    const recordingId = parseIdParam(req.params.id);
    const roles = ReviewService.getSpeakerRoles(recordingId);
    res.json({ success: true, data: roles });
  }

  static clearRole(req: Request, res: Response<ApiResponse<null>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const { speakerLabel, reviewer, reason } = req.body;

      ReviewService.unassignSpeakerRole(recordingId, speakerLabel, reviewer, reason);
      res.json({ success: true, data: null });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ROLE_CLEAR_FAILED', message: err.message } });
    }
  }

  static registerParticipant(req: Request, res: Response<ApiResponse<CourtParticipant>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const { fullName, role, reviewer, witnessDesignation, description } = req.body;

      const participant = ParticipantService.registerParticipant(
        recordingId,
        fullName,
        role,
        reviewer,
        witnessDesignation,
        description
      );
      res.json({ success: true, data: participant });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'PARTICIPANT_REGISTER_FAILED', message: err.message } });
    }
  }

  static listParticipants(req: Request, res: Response<ApiResponse<CourtParticipant[]>>): void {
    const recordingId = parseIdParam(req.params.id);
    const participants = ParticipantService.listParticipants(recordingId);
    res.json({ success: true, data: participants });
  }

  static verifyParticipant(req: Request, res: Response<ApiResponse<CourtParticipant>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const participantId = parseIdParam(req.params.participantId);
      const { reviewer } = req.body;

      const participant = ParticipantService.verifyParticipant(recordingId, participantId, reviewer);
      res.json({ success: true, data: participant });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'PARTICIPANT_VERIFY_FAILED', message: err.message } });
    }
  }

  static deleteParticipant(req: Request, res: Response<ApiResponse<null>>): void {
    try {
      const recordingId = parseIdParam(req.params.id);
      const participantId = parseIdParam(req.params.participantId);
      const { reviewer } = req.body;

      ParticipantService.deleteParticipant(recordingId, participantId, reviewer);
      res.json({ success: true, data: null });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'PARTICIPANT_DELETE_FAILED', message: err.message } });
    }
  }
}
