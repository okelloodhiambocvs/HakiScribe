import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Upload,
  Mic,
  FileAudio,
  CheckSquare,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Activity,
  User,
} from 'lucide-react';
import { Recording, Step } from '../types';
import { ApiClient } from '../services/apiClient';
import { AppStorage } from '../services/storage';

interface DashboardViewProps {
  reviewer: string;
  onNavigate: (step: Step) => void;
  onSelectSession: (recording: Recording) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reviewer,
  onNavigate,
  onSelectSession,
  onNotify,
}) => {
  const [sessions, setSessions] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const sessionList = await ApiClient.listSessions();
      setSessions(sessionList as any);
    } catch (err: any) {
      console.warn('[Dashboard] Could not fetch data:', err);
      // Fallback to local storage if API is unreachable
      const rec = AppStorage.getRecording();
      setSessions(rec ? [rec] : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLoadDemo = async () => {
    if (!reviewer.trim()) {
      onNotify('Enter your reviewer name in the left panel before loading the demo.', 'warning');
      return;
    }
    setIsDemoLoading(true);
    try {
      const session = await ApiClient.loadDemo(reviewer.trim());
      AppStorage.setRecording(session);
      onSelectSession(session);
      onNotify('Benchmark demo recording (CR 123/2026) loaded successfully.', 'success');
      await fetchDashboardData();
    } catch (err: any) {
      onNotify(err.message || 'Failed to load demo session', 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Derive genuine metrics from actual backend sessions
  const totalSessions = sessions.length;
  const completedTranscriptions = sessions.filter(
    (s) => s.status === 'EXPORTED' || s.status === 'ARCHIVED'
  ).length;
  const awaitingReview = sessions.filter(
    (s) =>
      s.status === 'TRANSCRIBED' ||
      s.status === 'REVIEWING' ||
      s.status === 'UPLOADED' ||
      !s.status
  ).length;
  const processingCount = sessions.filter((s) => s.status === 'TRANSCRIBING').length;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header bar with Refresh and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8D9B8]">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D2C] flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#C9A86A]" />
            <span>Judicial Workflow Dashboard</span>
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            Operational overview of hearing sessions, human reviews, and export drafts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8D9B8] hover:bg-[#FAF7F0] text-[#0B3D2C] rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C9A86A] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span>Ingest Audio</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('live')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Mic className="w-3.5 h-3.5 text-[#0B3D2C]" />
            <span>Live Mic</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 bg-white border border-[#E8D9B8] border-t-3 border-t-[#0B3D2C] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Total Sessions
            </span>
            <FileAudio className="w-4 h-4 text-[#0B3D2C]" />
          </div>
          <div className="text-2xl font-black text-[#0B3D2C] mt-2">
            {totalSessions}
          </div>
          <div className="text-[10px] text-[#57534E] mt-1">Recorded or ingested hearings</div>
        </div>

        <div className="p-4 bg-white border border-[#E8D9B8] border-t-3 border-t-[#C9A86A] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Awaiting Review
            </span>
            <Clock className="w-4 h-4 text-[#C9A86A]" />
          </div>
          <div className="text-2xl font-black text-[#C9A86A] mt-2">
            {awaitingReview}
          </div>
          <div className="text-[10px] text-[#57534E] mt-1">Pending human verification</div>
        </div>

        <div className="p-4 bg-white border border-[#E8D9B8] border-t-3 border-t-[#137333] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              Completed
            </span>
            <CheckSquare className="w-4 h-4 text-[#137333]" />
          </div>
          <div className="text-2xl font-black text-[#137333] mt-2">
            {completedTranscriptions}
          </div>
          <div className="text-[10px] text-[#57534E] mt-1">Exported with audit log</div>
        </div>

        <div className="p-4 bg-white border border-[#E8D9B8] border-t-3 border-t-[#B45309] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
              In Processing
            </span>
            <Activity className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="text-2xl font-black text-[#B45309] mt-2">
            {processingCount}
          </div>
          <div className="text-[10px] text-[#57534E] mt-1">Active ASR or diarization jobs</div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0B3D2C] flex items-center gap-1.5">
            <FileAudio className="w-4 h-4 text-[#C9A86A]" />
            <span>Recently Ingested Sessions</span>
          </h3>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-bold text-[#0B3D2C] hover:text-[#C9A86A] flex items-center gap-1 transition-colors"
            >
              <span>View all in Archive</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="hakiscribe-card text-center py-8 text-xs text-[#57534E]">
            <RefreshCw className="w-5 h-5 text-[#C9A86A] animate-spin mx-auto mb-2" />
            Loading courtroom recordings...
          </div>
        ) : sessions.length === 0 ? (
          /* Appropriate Empty State */
          <div className="hakiscribe-card text-center py-10 px-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#C9A86A] flex items-center justify-center mx-auto text-[#0B3D2C]">
              <FileAudio className="w-6 h-6 text-[#C9A86A]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#0B3D2C]">No recording sessions yet</h4>
              <p className="text-xs text-[#57534E] max-w-sm mx-auto">
                Begin by uploading an audio recording from court proceedings or loading the synthetic benchmark demo.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="px-4 py-2 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] rounded-lg text-xs font-bold transition-colors"
              >
                Upload Case Audio
              </button>
              <button
                type="button"
                disabled={isDemoLoading}
                onClick={handleLoadDemo}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] rounded-lg text-xs font-bold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A86A]" />
                <span>{isDemoLoading ? 'Loading Demo...' : 'Load Demo (CR 123/2026)'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session) => {
              const statusLabel = session.status || 'UPLOADED';
              const statusBadgeClass =
                statusLabel === 'EXPORTED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : statusLabel === 'TRANSCRIBED' || statusLabel === 'REVIEWING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-stone-50 text-stone-700 border-stone-300';

              return (
                <div
                  key={session.id}
                  className="p-3.5 bg-white border border-[#E8D9B8] rounded-xl hover:border-[#C9A86A] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0B3D2C] truncate">
                        {session.filename}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#78716C]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C9A86A]" />
                        {formatDuration(session.duration_sec)}
                      </span>
                      <span>â€¢</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#78716C]" />
                        {session.uploaded_by}
                      </span>
                      <span>â€¢</span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        SHA256: {session.sha256.slice(0, 8)}â€¦
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        AppStorage.setRecording(session);
                        onSelectSession(session);
                        onNavigate('review');
                      }}
                      className="px-3 py-1.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] font-semibold text-xs rounded-lg transition-colors"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        AppStorage.setRecording(session);
                        onSelectSession(session);
                        onNavigate('export');
                      }}
                      className="px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] font-semibold text-xs rounded-lg transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
