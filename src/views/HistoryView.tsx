import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  FileAudio,
  Clock,
  User,
  ArrowRight,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  FileText,
  Activity,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Recording, Step, AuditEvent } from '../types';
import { ApiClient } from '../services/apiClient';
import { AppStorage } from '../services/storage';

interface HistoryViewProps {
  reviewer: string;
  onNavigate: (step: Step) => void;
  onSelectSession: (recording: Recording) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  reviewer,
  onNavigate,
  onSelectSession,
  onNotify,
}) => {
  const [sessions, setSessions] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');

  // Deletion modal state
  const [sessionToDelete, setSessionToDelete] = useState<Recording | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Audit modal state
  const [selectedAuditSession, setSelectedAuditSession] = useState<Recording | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const list = await ApiClient.listSessions();
      setSessions(list as any);
    } catch (err: any) {
      onNotify('Failed to retrieve session list: ' + err.message, 'error');
      const rec = AppStorage.getRecording();
      setSessions(rec ? [rec] : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpenAudit = async (session: Recording) => {
    setSelectedAuditSession(session);
    setIsLoadingAudit(true);
    try {
      const events = await ApiClient.getAuditEvents(session.id);
      setAuditEvents(events);
    } catch {
      setAuditEvents([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      onNotify('Type DELETE to confirm permanent removal.', 'warning');
      return;
    }
    if (!reviewer.trim()) {
      onNotify('Reviewer name is required for content-free deletion logging.', 'warning');
      return;
    }

    setIsDeleting(true);
    try {
      await ApiClient.deleteSession(sessionToDelete.id, reviewer.trim(), 'DELETE');
      onNotify(`Session ${sessionToDelete.filename} permanently deleted.`, 'success');
      setSessionToDelete(null);
      setDeleteConfirmation('');
      await fetchSessions();
    } catch (err: any) {
      onNotify('Delete failed: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesSearch =
          s.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.sha256.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === 'ALL' || (s.status || 'UPLOADED') === statusFilter;

        const matchesSource =
          sourceFilter === 'ALL' || (s.capture_source || 'upload') === sourceFilter;

        return matchesSearch && matchesStatus && matchesSource;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return b.duration_sec - a.duration_sec;
      });
  }, [sessions, searchQuery, statusFilter, sourceFilter, sortBy]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8D9B8]">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D2C] flex items-center gap-2">
            <History className="w-6 h-6 text-[#C9A86A]" />
            <span>Session Archive & History</span>
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            Browse, search, audit, and resume historical judicial transcription sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSessions}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8D9B8] hover:bg-[#FAF7F0] text-[#0B3D2C] rounded-lg text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#C9A86A] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 bg-white border border-[#E8D9B8] rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case filename, reviewer, or SHA-256..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
              aria-label="Filter by session status"
            >
              <option value="ALL">All Statuses</option>
              <option value="UPLOADED">Uploaded (Raw Audio)</option>
              <option value="TRANSCRIBED">Transcribed (Needs Review)</option>
              <option value="REVIEWING">In Human Review</option>
              <option value="EXPORTED">Exported Draft</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
              aria-label="Sort sessions"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="duration">Sort: Longest Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="hakiscribe-card text-center py-12 text-xs text-[#57534E]">
          <RefreshCw className="w-6 h-6 text-[#C9A86A] animate-spin mx-auto mb-2" />
          Loading courtroom sessions from database...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="hakiscribe-card text-center py-12 px-6 space-y-3">
          <FileAudio className="w-10 h-10 text-[#C9A86A] mx-auto" />
          <h3 className="text-base font-bold text-[#0B3D2C]">No matching sessions found</h3>
          <p className="text-xs text-[#57534E] max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or resetting the filters.'
              : 'No judicial sessions have been recorded or uploaded yet.'}
          </p>
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setSourceFilter('ALL');
              }}
              className="px-3.5 py-1.5 bg-[#FAF7F0] border border-[#C9A86A] text-[#0B3D2C] text-xs font-bold rounded-lg hover:bg-[#E8D9B8]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const statusLabel = session.status || 'UPLOADED';
            const isCompleted = statusLabel === 'EXPORTED';
            const isPendingReview =
              statusLabel === 'TRANSCRIBED' || statusLabel === 'REVIEWING';

            return (
              <div
                key={session.id}
                className="p-4 bg-white border border-[#E8D9B8] rounded-xl hover:border-[#C9A86A] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                {/* Session Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#0B3D2C] truncate">
                      {session.filename}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isPendingReview
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-[9px] font-semibold text-[#78716C] bg-[#FAF7F0] border border-[#E8D9B8] px-2 py-0.5 rounded-full uppercase">
                      {session.capture_source === 'live' ? 'Live Stream' : 'Audio Upload'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#78716C]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C9A86A]" />
                      Duration: <strong>{formatDuration(session.duration_sec)}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#78716C]" />
                      Officer: <strong>{session.uploaded_by}</strong>
                    </span>
                    <span>•</span>
                    <span>Recorded: {formatDate(session.created_at)}</span>
                  </div>

                  <div className="text-[10px] text-[#78716C] font-mono truncate">
                    SHA-256: {session.sha256}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      AppStorage.setRecording(session);
                      onSelectSession(session);
                      onNavigate('review');
                    }}
                    className="px-3 py-1.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] font-bold text-xs rounded-lg transition-colors shadow-2xs"
                  >
                    Open Review
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      AppStorage.setRecording(session);
                      onSelectSession(session);
                      onNavigate('export');
                    }}
                    className="px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] font-bold text-xs rounded-lg transition-colors shadow-2xs"
                  >
                    Export Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAudit(session)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#78716C] border border-[#E8D9B8] font-medium text-xs rounded-lg transition-colors"
                    title="Inspect Audit Trail"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionToDelete(session)}
                    className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-[#B91C1C] border border-red-200 font-medium text-xs rounded-lg transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Log Modal */}
      {selectedAuditSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-[#C9A86A]">
            <div className="p-4 border-b border-[#E8D9B8] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0B3D2C] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#137333]" />
                  <span>Audit Trail: {selectedAuditSession.filename}</span>
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  Immutable ledger of session lifecycle, reviews, and corrections
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditSession(null)}
                className="text-[#78716C] hover:text-[#1F2A24] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {isLoadingAudit ? (
                <div className="text-center py-8 text-xs text-[#78716C]">
                  Loading session audit events...
                </div>
              ) : auditEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#78716C]">
                  No audit events found for this session.
                </div>
              ) : (
                auditEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B3D2C] uppercase text-[10px]">
                        {event.action}
                      </span>
                      <span className="text-[10px] text-[#78716C]">{formatDate(event.timestamp)}</span>
                    </div>
                    <div className="text-[#1F2A24] font-medium">{event.details}</div>
                    <div className="text-[10px] text-[#78716C] font-mono">Actor: {event.actor}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#E8D9B8] bg-[#FAF7F0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditSession(null)}
                className="px-4 py-1.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold text-xs rounded-lg hover:bg-[#082E21]"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-[#B91C1C] space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#0B3D2C]">
                Confirm Permanent Deletion
              </h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              This action will permanently purge the recording{' '}
              <strong>{sessionToDelete.filename}</strong>, its audio file, and all associated transcript segments. A content-free deletion log entry will be recorded in compliance with Kenyan judicial archiving rules.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0B3D2C] mb-1">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSessionToDelete(null);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 bg-[#FAF7F0] border border-[#E8D9B8] text-[#1F2A24] font-semibold text-xs rounded-lg hover:bg-[#E8D9B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#B91C1C] text-white font-bold text-xs rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
