import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  ArrowLeft,
  AlertCircle,
  Activity,
  ShieldCheck,
  Radio,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Recording, Segment, LiveTurn } from '../types';
import { AppStorage } from '../services/storage';
import { LiveMeter } from '../components/live/LiveMeter';
import { LiveFeed } from '../components/live/LiveFeed';
import { LiveControls } from '../components/live/LiveControls';

interface LiveViewProps {
  reviewer: string;
  onBackToWorkflow: () => void;
  onLoadLiveRecording: (recording: Recording, segments: Segment[]) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type LiveStatus = 'idle' | 'connecting' | 'recording' | 'transcribing' | 'paused' | 'completed' | 'failed';

export const LiveView: React.FC<LiveViewProps> = ({
  reviewer,
  onBackToWorkflow,
  onLoadLiveRecording,
  onNotify,
}) => {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [partialText, setPartialText] = useState('');
  const [connectionNote, setConnectionNote] = useState<string>('Ready to initialize microphone session');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const formatElapsed = (sec: number) => {
    const total = Math.max(0, Math.floor(sec));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const notify = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (onNotify) {
      onNotify(msg, type);
    } else {
      setErrorMessage(msg);
    }
  };

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const handleStart = async () => {
    if (!reviewer.trim()) {
      notify('Enter your reviewer name in the left panel first.', 'warning');
      return;
    }
    if (!consent) {
      notify('Participant and speaker consent is legally required before recording.', 'warning');
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatus('connecting');
    setConnectionNote('Requesting courtroom microphone access...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateMeter = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/audio/live-stream`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('recording');
        setConnectionNote('Live stream connected. Streaming 24kHz audio chunks...');
        setIsProcessing(false);

        timerRef.current = setInterval(() => {
          setElapsedSec((prev) => prev + 1);
        }, 1000);

        try {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = async (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              const buffer = await e.data.arrayBuffer();
              ws.send(buffer);
            }
          };
          recorder.start(1000);
        } catch (recErr) {
          console.warn('[LiveView] MediaRecorder fallback:', recErr);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'turn_complete' && data.turn) {
            setStatus('transcribing');
            setTurns((prev) => [
              ...prev,
              {
                turn_idx: data.turn.turn_idx ?? prev.length,
                speaker: data.turn.speaker,
                start_s: data.turn.start_s,
                end_s: data.turn.end_s,
                text: data.turn.text,
              },
            ]);
            setPartialText('');
            setTimeout(() => setStatus('recording'), 500);
          } else if (data.type === 'interim' && data.partial) {
            setPartialText(data.partial);
          } else if (data.type === 'status' && data.message) {
            setConnectionNote(data.message);
          }
        } catch (e) {
          console.warn('[LiveView] Notice on message parse:', e);
        }
      };

      ws.onerror = () => {
        setConnectionNote('Notice: Realtime WebSocket connection interrupted.');
      };

      ws.onclose = () => {
        if (status === 'recording' || status === 'connecting') {
          setConnectionNote('WebSocket connection closed.');
        }
      };
    } catch (err: any) {
      cleanupAudio();
      setStatus('failed');
      setIsProcessing(false);
      const errMsg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
          : err.message || 'Failed to initialize live microphone recording.';
      setErrorMessage(errMsg);
      notify(errMsg, 'error');
    }
  };

  const handlePause = () => {
    if (status !== 'recording' && status !== 'transcribing') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.pause(); } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = false; });
    }
    setStatus('paused');
    setConnectionNote('Recording paused. Audio stream muted.');
  };

  const handleResume = () => {
    if (status !== 'paused') return;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = true; });
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try { mediaRecorderRef.current.resume(); } catch {}
    }
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    setStatus('recording');
    setConnectionNote('Recording resumed. Streaming audio chunks...');
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cleanupAudio();
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    setStatus('completed');
    setPartialText('');
    setConnectionNote('Live recording concluded. Ready to transfer to Review Desk.');

    AppStorage.addLedgerEntry({
      timestamp: new Date().toISOString(),
      service: 'live_session_service',
      model: 'muse-realtime-transcribe',
      status: 'SUCCESS',
      duration_ms: elapsedSec * 1000,
      note: `Live session completed with ${turns.length} turns recorded`,
    });
  };

  const handleTransferToReview = () => {
    const liveRecording: Recording = {
      id: Date.now(),
      filename: `live_court_session_${new Date().toISOString().slice(0, 10)}.wav`,
      size_bytes: Math.round(elapsedSec * 48000),
      sha256: 'live_hash_' + Math.random().toString(36).substring(2, 14),
      duration_sec: Math.max(elapsedSec, 1),
      uploaded_by: reviewer.trim(),
      created_at: new Date().toISOString(),
      stored_path: '/demo-data/synthetic/case-cr-123-2026.wav',
      synthetic_attestation: true,
      capture_source: 'live',
      status: 'TRANSCRIBED',
    };

    const liveSegments: Segment[] = turns.map((t, idx) => ({
      id: idx + 1,
      idx,
      speaker: t.speaker,
      speaker_label: t.speaker,
      start_sec: t.start_s,
      end_sec: t.end_s,
      text_original: t.text,
      text_current: t.text,
      confidence: null,
      language: 'en-sw',
      is_approximate: false,
    }));

    onLoadLiveRecording(liveRecording, liveSegments);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupAudio();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E8D9B8]">
        <div>
          <button
            type="button"
            onClick={onBackToWorkflow}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D2C] hover:text-[#C9A86A] transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to File Ingestion</span>
          </button>
          <h2 className="text-2xl font-bold text-[#0B3D2C] flex items-center gap-2">
            <Radio className="w-6 h-6 text-[#C9A86A]" />
            <span>Live Courtroom Microphone Capture</span>
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            Real-time streaming speech recognition with turn diarization and instant transcription.
          </p>
        </div>

        {/* Live Status Indicator Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
              status === 'recording'
                ? 'bg-red-50 text-[#B91C1C] border-red-200 animate-pulse'
                : status === 'transcribing'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : status === 'paused'
                ? 'bg-stone-100 text-stone-700 border-stone-300'
                : status === 'completed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-stone-50 text-stone-600 border-stone-200'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'recording'
                  ? 'bg-[#B91C1C]'
                  : status === 'transcribing'
                  ? 'bg-amber-600'
                  : status === 'paused'
                  ? 'bg-stone-500'
                  : status === 'completed'
                  ? 'bg-emerald-600'
                  : 'bg-stone-400'
              }`}
            />
            <span className="uppercase tracking-wider font-extrabold text-[11px]">{status}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-[#B91C1C] rounded-xl flex items-start gap-2.5 text-xs text-[#B91C1C]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="font-semibold">{errorMessage}</div>
        </div>
      )}

      {/* Control Station Card */}
      <div className="hakiscribe-card space-y-4">
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#0B3D2C]">
                <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
                <span>Statutory Consent & Privacy Notice</span>
              </div>
              <p className="text-[#1F2A24] leading-relaxed">
                Live transcription processes verbal audio in real time. In compliance with Kenyan judicial ethics, consent must be secured from all active participants before recording.
              </p>
              <label className="flex items-center gap-2 pt-2 border-t border-[#E8D9B8] font-bold text-[#0B3D2C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="rounded text-[#0B3D2C] focus:ring-[#C9A86A]"
                />
                <span>I confirm that court participants have been notified and consented to recording</span>
              </label>
            </div>
          </div>
        )}

        {(status === 'recording' || status === 'paused' || status === 'transcribing') && (
          <LiveMeter
            elapsedSec={elapsedSec}
            audioLevel={audioLevel}
            turnCount={turns.length}
            formatElapsed={formatElapsed}
          />
        )}

        <LiveControls
          status={status}
          consent={consent}
          reviewer={reviewer}
          isProcessing={isProcessing}
          turnCount={turns.length}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onTransfer={handleTransferToReview}
          onReset={() => {
            setStatus('idle');
            setTurns([]);
            setElapsedSec(0);
            setPartialText('');
            setErrorMessage(null);
          }}
        />

        <div className="text-[11px] text-[#78716C] pt-2 border-t border-[#E8D9B8] flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#137333]" />
          <span>{connectionNote}</span>
        </div>
      </div>

      {/* Progressive Transcription Feed Subcomponent */}
      <LiveFeed
        turns={turns}
        partialText={partialText}
        formatElapsed={formatElapsed}
      />
    </div>
  );
};
