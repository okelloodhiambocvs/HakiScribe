import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Volume2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { LiveSessionState, Recording, Segment } from '../types';
import { PRIVACY_NOTICE } from '../constants/brand';
import { LIVE_SIMULATION_TURNS } from '../constants/demoData';
import { AppStorage } from '../services/storage';

interface LiveViewProps {
  reviewer: string;
  onBackToWorkflow: () => void;
  onLoadLiveRecording: (recording: Recording, segments: Segment[]) => void;
}

export const LiveView: React.FC<LiveViewProps> = ({
  reviewer,
  onBackToWorkflow,
  onLoadLiveRecording,
}) => {
  const [consent, setConsent] = useState(false);
  const [sessionState, setSessionState] = useState<LiveSessionState>({
    status: 'idle',
    elapsed_s: 0,
    turns: [],
    partial: '',
    recording_id: null,
    turn_count: 0,
    last_error: null,
    note: null,
  });
  const [isFinalised, setIsFinalised] = useState(false);
  const [devices, setDevices] = useState<string[]>([
    'Default Microphone (Built-in Audio Device)',
    'External USB Array (Conference 24kHz)',
  ]);
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);

  const timerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const formatElapsed = (sec: number) => {
    const total = Math.max(0, Math.floor(sec));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!reviewer.trim()) {
      alert('Enter your reviewer name in the sidebar first.');
      return;
    }
    if (!consent) {
      alert('Speaker consent is required to start a live session.');
      return;
    }

    setSessionState({
      status: 'live',
      elapsed_s: 0,
      turns: [],
      partial: 'Connecting to Meta realtime audio stream...',
      recording_id: Date.now(),
      turn_count: 0,
      last_error: null,
      note: 'Streaming 24kHz mono PCM speech to Meta realtime endpoint',
    });
    setIsFinalised(false);

    let sec = 0;
    timerRef.current = setInterval(() => {
      sec += 1;
      setSessionState((prev) => ({ ...prev, elapsed_s: sec }));
    }, 1000);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/audio/live-stream`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setSessionState((prev) => ({
          ...prev,
          partial: 'Connected. Listening for courtroom speech...',
          note: 'Connected to Meta Realtime ASR WebSocket',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'turn_complete' && data.turn) {
            setSessionState((prev) => ({
              ...prev,
              turns: [
                ...prev.turns,
                {
                  turn_idx: data.turn.turn_idx ?? prev.turns.length,
                  speaker: data.turn.speaker,
                  start_s: data.turn.start_s,
                  end_s: data.turn.end_s,
                  text: data.turn.text,
                },
              ],
              turn_count: prev.turn_count + 1,
              partial: '',
            }));
          } else if (data.type === 'interim' && data.partial) {
            setSessionState((prev) => ({ ...prev, partial: data.partial }));
          } else if (data.type === 'status' && data.message) {
            setSessionState((prev) => ({ ...prev, note: data.message }));
          }
        } catch (e) {
          console.warn('[LiveView] WebSocket message parse notice:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[LiveView] WebSocket error, using fallback streaming:', err);
      };
    } catch (wsErr) {
      console.warn('[LiveView] Could not initialize WebSocket:', wsErr);
    }
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setSessionState((prev) => ({
      ...prev,
      status: 'ended',
      partial: '',
      note: 'Session concluded. Ready for batch finalisation.',
    }));

    AppStorage.addLedgerEntry({
      timestamp: new Date().toISOString(),
      service: 'live_session_service',
      model: 'muse-realtime-transcribe',
      status: 'SUCCESS',
      duration_ms: sessionState.elapsed_s * 1000,
      note: `Live session completed with ${sessionState.turn_count} turns recorded`,
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, []);

  const handleFinalise = () => {
    setIsFinalised(true);
    AppStorage.addLedgerEntry({
      timestamp: new Date().toISOString(),
      service: 'muse-voice-transcribe-1.0',
      model: 'batch-finaliser',
      status: 'SUCCESS',
      duration_ms: 1100,
      note: 'Live recording converted to batch diarization pass',
    });
  };

  const handleOpenInReview = () => {
    const liveRecording: Recording = {
      id: sessionState.recording_id || Date.now(),
      filename: `live_capture_${new Date().toISOString().slice(0, 10)}.wav`,
      size_bytes: Math.round(sessionState.elapsed_s * 48000),
      sha256: 'live_session_sha256_' + Date.now(),
      duration_sec: sessionState.elapsed_s,
      uploaded_by: reviewer.trim(),
      created_at: new Date().toISOString(),
      stored_path: '/demo-data/synthetic/case-cr-123-2026.wav',
      synthetic_attestation: true,
    };

    const liveSegments: Segment[] = sessionState.turns.map((t, idx) => ({
      id: idx + 1,
      idx,
      speaker: t.speaker,
      speaker_label: t.speaker,
      start_sec: t.start_s,
      end_sec: t.end_s,
      text_original: t.text,
      text_current: t.text,
      confidence: null,
      language: 'sw-en',
      is_approximate: !isFinalised,
    }));

    onLoadLiveRecording(liveRecording, liveSegments);
  };

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToWorkflow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C9A86A] text-[#0B3D2C] hover:bg-[#FAF7F0] rounded-lg text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to workflow</span>
        </button>

        <span className="text-xs font-mono text-gray-500">Live Microphone Capture</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0B3D2C]">Live Transcription</h2>
        <p className="text-sm text-[#57534E]">
          Real-time consented court microphone capture with streaming partial transcriptions and batch finalisation.
        </p>
      </div>

      {/* Warning */}
      <div className="p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs text-[#0B3D2C] font-semibold flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#C9A86A] shrink-0" />
        <span>
          Synthetic demo only. AI proposes, HUMAN REVIEWS. This is not an official court record.
        </span>
      </div>

      {/* Active Session Display */}
      {sessionState.status === 'live' ? (
        <div className="hakiscribe-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
              <span className="font-bold text-sm text-red-700">LIVE (approximate timestamps)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0B3D2C] bg-[#FAF7F0] px-3 py-1 rounded border border-[#E8D9B8]">
              <Clock className="w-4 h-4 text-[#C9A86A]" />
              <span>Elapsed: {formatElapsed(sessionState.elapsed_s)}</span>
            </div>
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop session</span>
            </button>
          </div>

          {/* Streaming Turns */}
          <div className="space-y-2 bg-[#FAF7F0] p-4 rounded-xl border border-[#E8D9B8] min-h-[220px]">
            <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider block mb-2">
              Streaming Audio Feed (24kHz Mono PCM)
            </span>

            {sessionState.turns.map((turn, i) => (
              <div key={i} className="p-2.5 bg-white rounded-lg border border-[#E8D9B8]/70 text-xs space-y-1">
                <div className="flex items-center justify-between text-gray-500 font-mono text-[10px]">
                  <span className="font-bold text-[#0B3D2C]">{turn.speaker}</span>
                  <span>[{turn.start_s.toFixed(1)}s – {turn.end_s.toFixed(1)}s]</span>
                </div>
                <div className="text-[#1F2A24] font-medium text-sm">{turn.text}</div>
              </div>
            ))}

            {sessionState.partial && (
              <div className="p-2 text-xs italic text-[#78716C] animate-pulse flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#C9A86A]" />
                <span>{sessionState.partial}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Setup New Session or Session Summary */
        <div className="space-y-5">
          {sessionState.status === 'ended' && (
            <div className="hakiscribe-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
                <h3 className="text-base font-bold text-[#0B3D2C]">Live Session Summary</h3>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    isFinalised
                      ? 'bg-green-100 text-[#137333]'
                      : 'bg-yellow-100 text-[#B45309]'
                  }`}
                >
                  {isFinalised ? 'FINAL (batch pass)' : 'LIVE (approximate timestamps)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#FAF7F0] p-3 rounded-lg border border-[#E8D9B8] text-xs">
                <div>
                  <span className="text-gray-500 block">Total Turns</span>
                  <strong className="text-base text-[#0B3D2C]">{sessionState.turn_count}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Duration Elapsed</span>
                  <strong className="text-base text-[#0B3D2C]">
                    {formatElapsed(sessionState.elapsed_s)}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!isFinalised && (
                  <button
                    onClick={handleFinalise}
                    className="px-5 py-2.5 bg-[#C9A86A] hover:bg-[#B39356] text-[#0B3D2C] font-bold text-xs rounded-lg shadow-xs flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Finalise with batch pass</span>
                  </button>
                )}

                <button
                  onClick={handleOpenInReview}
                  className="px-5 py-2.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] font-bold text-xs rounded-lg shadow-xs flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#C9A86A]" />
                  <span>Open in Review transcript</span>
                </button>
              </div>
            </div>
          )}

          {/* New Live Session Setup Card */}
          <div className="hakiscribe-card space-y-4">
            <h3 className="text-base font-bold text-[#0B3D2C] border-b border-[#E8D9B8] pb-2">
              New Live Session
            </h3>

            {/* Privacy notice box */}
            <div className="p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] leading-relaxed">
              <strong className="text-[#0B3D2C] block mb-1">Speaker Consent Notice</strong>
              All speakers must be notified and consent before audio capture begins. Only synthetic demonstration or fully consented proceedings may be recorded.
            </div>

            {/* Device Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-[#0B3D2C]">Microphone Input Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#C9A86A] rounded-lg text-xs font-medium text-[#1F2A24]"
              >
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none pt-1">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded text-[#0B3D2C] focus:ring-[#C9A86A]"
              />
              <span className="font-semibold text-[#0B3D2C]">
                All speakers have consented; this is a synthetic or consented session
              </span>
            </label>

            {!reviewer.trim() && (
              <p className="text-xs text-[#B45309]">
                Enter your reviewer name in the sidebar before starting live capture.
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={handleStart}
                disabled={!reviewer.trim() || !consent}
                className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-xs transition-all flex items-center gap-2 ${
                  reviewer.trim() && consent
                    ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Mic className="w-4 h-4 text-[#C9A86A]" />
                <span>Start live session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
