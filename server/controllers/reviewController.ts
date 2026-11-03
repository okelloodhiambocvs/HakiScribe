import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { AIReviewResult, ApiResponse, ReviewFlag, SpeakerRoleMapping } from '../../shared/types';
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
      const { speakerLabel, role, reviewer, reason } = req.body;

      const mapping = ReviewService.assignSpeakerRole(recordingId, speakerLabel, role, reviewer, reason);
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
}
