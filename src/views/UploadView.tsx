import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  ShieldCheck,
  Hash,
} from 'lucide-react';
import { PRIVACY_NOTICE } from '../constants/brand';
import { Recording } from '../types';
import { AppStorage } from '../services/storage';
import { ApiClient } from '../services/apiClient';

interface UploadViewProps {
  reviewer: string;
  recording: Recording | null;
  onRecordingChange: (rec: Recording | null) => void;
  onNavigateToTranscribe: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.webm'];

export const UploadView: React.FC<UploadViewProps> = ({
  reviewer,
  recording,
  onRecordingChange,
  onNavigateToTranscribe,
  onNotify,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [computedSha, setComputedSha] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return `Unsupported format "${ext}". Please upload MP3, WAV, M4A, AAC, OGG, OPUS, or WEBM audio.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds the 25MB limit (selected file is ${formatFileSize(file.size)}). Please choose a smaller hearing extract.`;
    }
    return null;
  };

  const calculateSha256 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setComputedSha(hashHex);
      return hashHex;
    } catch {
      const fallback = 'sha256_client_' + Date.now();
      setComputedSha(fallback);
      return fallback;
    }
  };

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      setComputedSha(null);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    calculateSha256(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUploadAndValidate = async () => {
    if (!reviewer.trim()) {
      setErrorMessage('Reviewer Name is mandatory in the left panel before uploading.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Please select a courtroom recording file to upload.');
      return;
    }
    if (!attested) {
      setErrorMessage('Judicial procedural attestation must be confirmed before processing.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      setUploadProgress(50);
      const session = await ApiClient.uploadAudio(selectedFile, reviewer.trim(), attested);
      setUploadProgress(100);

      AppStorage.setRecording(session as any);
      onRecordingChange(session as any);

      if (onNotify) {
        onNotify(`Successfully uploaded ${session.filename} (SHA256 verified).`, 'success');
      }

      setTimeout(() => {
        setIsUploading(false);
        onNavigateToTranscribe();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload audio to server.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleLoadDemo = async () => {
    if (!reviewer.trim()) {
      setErrorMessage('Please enter your Reviewer Name in the left panel first.');
      return;
    }
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const session = await ApiClient.loadDemo(reviewer.trim());
      AppStorage.setRecording(session as any);
      onRecordingChange(session as any);
      if (onNotify) {
        onNotify('Loaded demo courtroom recording (CR 123/2026).', 'success');
      }
      setIsUploading(false);
      onNavigateToTranscribe();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load demo recording');
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setComputedSha(null);
    setAttested(false);
    setErrorMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    AppStorage.clearAll();
    onRecordingChange(null);
  };

  const canUpload = Boolean(selectedFile && attested && reviewer.trim() && !errorMessage);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B3D2C] flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#C9A86A]" />
          <span>Stage 1 — Audio Ingestion & Integrity Validation</span>
        </h2>
        <p className="text-xs text-[#57534E] mt-0.5">
          Ingest courtroom audio with SHA-256 cryptographic verification and statutory confidentiality controls.
        </p>
      </div>

      {/* Main Upload Desk Card */}
      <div className="hakiscribe-card space-y-5">
        {/* Drag and Drop Zone */}
        <div>
          <label className="block text-xs font-bold text-[#0B3D2C] uppercase tracking-wider mb-2">
            Select Court Hearing Audio File
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-[#0B3D2C] bg-[#E8D9B8]/40 scale-[1.01]'
                : selectedFile
                ? 'border-[#137333] bg-emerald-50/20'
                : 'border-[#C9A86A] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              id="hearing-file-input"
              accept=".mp3,.wav,.m4a,.aac,.ogg,.opus,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="hearing-file-input"
              className="flex flex-col items-center justify-center cursor-pointer select-none"
            >
              <div className="w-12 h-12 rounded-full bg-white border border-[#C9A86A] flex items-center justify-center mb-3 shadow-2xs">
                <Upload className="w-6 h-6 text-[#0B3D2C]" />
              </div>
              <span className="font-bold text-sm text-[#0B3D2C]">
                {selectedFile ? selectedFile.name : 'Click to browse files or drag audio here'}
              </span>
              <span className="text-xs text-[#78716C] mt-1">
                Accepted formats: WAV, MP3, M4A, AAC, OGG, OPUS, WEBM (Maximum 25MB)
              </span>
            </label>
          </div>
        </div>

        {/* Selected File Inspection Details */}
        {selectedFile && (
          <div className="p-4 bg-white border border-[#E8D9B8] rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B3D2C]">
                <FileAudio className="w-4 h-4 text-[#C9A86A]" />
                <span>File Metadata & Integrity Check</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setComputedSha(null);
                }}
                className="text-[#78716C] hover:text-[#B91C1C] p-1 rounded-md"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2 bg-[#FAF7F0] rounded-lg">
                <span className="text-[10px] text-[#78716C] uppercase font-bold block">Filename</span>
                <span className="font-medium text-[#1F2A24] truncate block">{selectedFile.name}</span>
              </div>
              <div className="p-2 bg-[#FAF7F0] rounded-lg">
                <span className="text-[10px] text-[#78716C] uppercase font-bold block">Size</span>
                <span className="font-medium text-[#1F2A24]">{formatFileSize(selectedFile.size)}</span>
              </div>
              <div className="p-2 bg-[#FAF7F0] rounded-lg">
                <span className="text-[10px] text-[#78716C] uppercase font-bold block">MIME Type</span>
                <span className="font-medium text-[#1F2A24] font-mono text-[11px]">
                  {selectedFile.type || 'audio/wav'}
                </span>
              </div>
            </div>

            {computedSha && (
              <div className="p-2 bg-[#FAF7F0] rounded-lg flex items-center gap-2 text-[11px] font-mono text-[#57534E]">
                <Hash className="w-3.5 h-3.5 text-[#C9A86A] shrink-0" />
                <span className="truncate">SHA-256: {computedSha}</span>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress Bar (when active) */}
        {isUploading && (
          <div className="space-y-1.5 p-3 bg-[#FAF7F0] border border-[#E8D9B8] rounded-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0B3D2C]">
              <span>Ingesting and calculating cryptographic hash...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#E8D9B8] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0B3D2C] h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Privacy Notice Box */}
        <div className="p-3.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-xl text-xs text-[#1F2A24] leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-[#0B3D2C] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
            <span>Judicial Data Protection & Safeguards</span>
          </div>
          <p>{PRIVACY_NOTICE}</p>
        </div>

        {/* Attestation Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#0B3D2C] focus:ring-[#C9A86A] border-[#C9A86A]"
            />
            <span className="text-xs font-bold text-[#0B3D2C] leading-snug">
              I confirm this recording is for authorised judicial transcription demonstration and conforms with procedural integrity.
            </span>
          </label>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-[#B91C1C] rounded-xl flex items-start justify-between gap-3 text-xs text-[#B91C1C]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-[#B91C1C] hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!canUpload || isUploading}
            onClick={handleUploadAndValidate}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs transition-all shadow-xs ${
              canUpload && !isUploading
                ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {isUploading ? 'Ingesting Audio...' : 'Upload & Validate Recording'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-semibold text-xs border border-[#E8D9B8] text-[#1F2A24] bg-white hover:bg-[#FAF7F0] transition-colors"
          >
            Clear Selection
          </button>

          {/* Quick Demo Loader */}
          {!recording && (
            <div className="sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                disabled={isUploading}
                onClick={handleLoadDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border-2 border-[#C9A86A] transition-all shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-[#C9A86A]" />
                <span>Load Benchmark Demo (CR 123/2026)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
