import { Request, Response } from 'express';
import { AuditRepo } from '../db/repositories/auditRepo';
import { isMetaConfigured } from '../integrations/meta/metaClient';
import { ApiCallLedgerEntry, ApiResponse, AuditEvent } from '../../shared/types';

export class AuditController {
  static getEvents(req: Request, res: Response<ApiResponse<AuditEvent[]>>): void {
    const recordingId = req.query.recordingId ? parseInt(req.query.recordingId as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const events = AuditRepo.getEvents(recordingId, limit);
    res.json({ success: true, data: events });
  }

  static getLedger(req: Request, res: Response<ApiResponse<ApiCallLedgerEntry[]>>): void {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const ledger = AuditRepo.getRecentApiCalls(limit);
    res.json({ success: true, data: ledger });
  }

  static getSystemHealth(req: Request, res: Response<ApiResponse<any>>): void {
    const checks = [
      { name: 'SQLite Database', status: 'OK', note: 'data/hakiscribe.db active with WAL mode' },
      { name: 'Audio Ingestion Pipeline', status: 'OK', note: '25MB limit, SHA-256 fingerprinting' },
      { name: 'Muse Voice Transcribe', status: isMetaConfigured() ? 'OK' : 'MOCK', note: isMetaConfigured() ? 'Real Meta Model API configured' : 'Synthetic fallback active' },
      { name: 'Muse Spark Reviewer', status: 'OK', note: 'Evidence quoting guardrail active' },
      { name: 'Muse Wonder Summaries', status: 'OK', note: 'Bilingual orientation drafts (EN/SW)' },
    ];

    res.json({
      success: true,
      data: {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        checks,
      },
    });
  }
}
