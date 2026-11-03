import { db } from '../database';
import { ApiCallLedgerEntry, AuditEvent } from '../../../shared/types';

export class AuditRepo {
  static logEvent(event: Omit<AuditEvent, 'id'>): AuditEvent {
    const stmt = db.prepare(`
      INSERT INTO audit_events (recording_id, actor, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      event.recording_id,
      event.actor,
      event.action,
      event.details,
      event.timestamp
    );

    return { ...event, id: Number(info.lastInsertRowid) };
  }

  static getEvents(recordingId?: number, limit = 50): AuditEvent[] {
    let query = 'SELECT * FROM audit_events';
    const params: any[] = [];
    if (recordingId) {
      query += ' WHERE recording_id = ?';
      params.push(recordingId);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params) as AuditEvent[];
  }

  static logApiCall(call: Omit<ApiCallLedgerEntry, 'id'>): ApiCallLedgerEntry {
    const stmt = db.prepare(`
      INSERT INTO api_calls (timestamp, service, model, endpoint, status, duration_ms, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      call.timestamp,
      call.service,
      call.model,
      call.endpoint,
      call.status,
      call.duration_ms,
      call.note
    );

    return { ...call, id: Number(info.lastInsertRowid) };
  }

  static getRecentApiCalls(limit = 50): ApiCallLedgerEntry[] {
    return db.prepare(`
      SELECT * FROM api_calls ORDER BY id DESC LIMIT ?
    `).all(limit) as ApiCallLedgerEntry[];
  }
}
