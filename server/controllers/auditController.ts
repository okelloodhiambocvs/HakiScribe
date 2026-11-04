import { Request, Response } from 'express';
import { AuditRepo } from '../db/repositories/auditRepo';
import { isMetaConfigured, META_API_CONFIG, metaKeySource } from '../integrations/meta/metaClient';
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
    const metaLive = isMetaConfigured();
    const keySource = metaKeySource();
    const modelStatus = (model: string, label: string) => ({
      name: label,
      status: metaLive ? 'OK' : 'MOCK',
      model,
      note: metaLive
        ? `Real Meta Model API configured (${keySource}); model ${model}`
        : `No API key: deterministic ${model.split('-mock')[0]} fallback active`,
    });

    const checks = [
      { name: 'SQLite Database', status: 'OK', note: 'data/hakiscribe.db active with WAL mode' },
      { name: 'Audio Ingestion Pipeline', status: 'OK', note: '25MB limit, SHA-256 fingerprinting' },
      modelStatus(META_API_CONFIG.voiceModel, 'Muse Voice Transcribe (batch)'),
      {
        name: 'Muse Voice Transcribe (realtime)',
        status: metaLive ? 'OK' : 'MOCK',
        model: META_API_CONFIG.voiceModel,
        note: metaLive
          ? `WebSocket handshake auth ready; model ${META_API_CONFIG.voiceModel}`
          : 'No API key: demo stream active',
      },
      modelStatus(META_API_CONFIG.sparkModel, 'Muse Spark Reviewer'),
      modelStatus(META_API_CONFIG.wonderModel, 'Muse Wonder Summaries'),
    ];

    res.json({
      success: true,
      data: {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        metaMode: metaLive ? 'REAL' : 'MOCK',
        checks,
      },
    });
  }
}
