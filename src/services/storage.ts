import {
  Correction,
  ExportHistory,
  Flag,
  Recording,
  Segment,
  SpeakerRoleMapping,
  ApiCallLedgerEntry,
} from '../types';
import { DEMO_RECORDING, DEMO_SEGMENTS, INITIAL_FLAGS } from '../constants/demoData';

const STORAGE_KEYS = {
  REVIEWER: 'hakiscribe_reviewer',
  RECORDING: 'hakiscribe_recording',
  SEGMENTS: 'hakiscribe_segments',
  FLAGS: 'hakiscribe_flags',
  CORRECTIONS: 'hakiscribe_corrections',
  ROLES: 'hakiscribe_roles',
  EXPORTS: 'hakiscribe_exports',
  LEDGER: 'hakiscribe_ledger',
  MOCK_MODE: 'hakiscribe_mock_mode',
};

export class AppStorage {
  static getReviewer(): string {
    return localStorage.getItem(STORAGE_KEYS.REVIEWER) || '';
  }

  static setReviewer(name: string): void {
    localStorage.setItem(STORAGE_KEYS.REVIEWER, name);
  }

  static getMockMode(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.MOCK_MODE);
    return val === null ? true : val === 'true';
  }

  static setMockMode(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.MOCK_MODE, String(val));
  }

  static getRecording(): Recording | null {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDING);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setRecording(recording: Recording | null): void {
    if (!recording) {
      localStorage.removeItem(STORAGE_KEYS.RECORDING);
    } else {
      localStorage.setItem(STORAGE_KEYS.RECORDING, JSON.stringify(recording));
    }
  }

  static getSegments(): Segment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SEGMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static setSegments(segments: Segment[]): void {
    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
  }

  static getFlags(): Flag[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FLAGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static setFlags(flags: Flag[]): void {
    localStorage.setItem(STORAGE_KEYS.FLAGS, JSON.stringify(flags));
  }

  static getCorrections(): Correction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CORRECTIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static setCorrections(corrections: Correction[]): void {
    localStorage.setItem(STORAGE_KEYS.CORRECTIONS, JSON.stringify(corrections));
  }

  static getSpeakerRoles(): SpeakerRoleMapping[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ROLES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static setSpeakerRoles(roles: SpeakerRoleMapping[]): void {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
  }

  static getExports(): ExportHistory[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPORTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static addExport(item: ExportHistory): void {
    const list = this.getExports();
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.EXPORTS, JSON.stringify(list));
  }

  static getLedger(): ApiCallLedgerEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LEDGER);
    if (!raw) {
      return [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          service: 'muse-voice-transcribe-1.0',
          model: 'DIARIZATION',
          status: 'MOCK',
          duration_ms: 1240,
          note: 'Synthetic demo pass loaded',
        },
      ];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static addLedgerEntry(entry: Omit<ApiCallLedgerEntry, 'id'>): void {
    const ledger = this.getLedger();
    ledger.unshift({ ...entry, id: Date.now() });
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger.slice(0, 50)));
  }

  static loadDemoDataset(reviewer: string): Recording {
    const recording = { ...DEMO_RECORDING, uploaded_by: reviewer, created_at: new Date().toISOString() };
    this.setRecording(recording);
    this.setSegments([...DEMO_SEGMENTS]);
    this.setFlags([...INITIAL_FLAGS]);
    this.setCorrections([]);
    this.setSpeakerRoles([]);
    this.addLedgerEntry({
      timestamp: new Date().toISOString(),
      service: 'ingestion_service',
      model: 'demo-data-loader',
      status: 'SUCCESS',
      duration_ms: 120,
      note: 'Demo recording and synthetic ground-truth loaded',
    });
    return recording;
  }

  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDING);
    localStorage.removeItem(STORAGE_KEYS.SEGMENTS);
    localStorage.removeItem(STORAGE_KEYS.FLAGS);
    localStorage.removeItem(STORAGE_KEYS.CORRECTIONS);
    localStorage.removeItem(STORAGE_KEYS.ROLES);
    localStorage.removeItem(STORAGE_KEYS.EXPORTS);
  }
}
