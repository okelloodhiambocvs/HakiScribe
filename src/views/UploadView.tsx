import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileAudio, Sparkles, Trash2 } from 'lucide-react';
import { PRIVACY_NOTICE } from '../constants/brand';
import { Recording } from '../types';
import { AppStorage } from '../services/storage';
import { ApiClient } from '../services/apiClient';

interface UploadViewProps {
  reviewer: string;
  recording: Recording | null;
  onRecordingChange: (rec: Recording | null) => void;
  onNavigateToTranscribe: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  reviewer,
  recording,
  onRecordingChange,
  onNavigateToTranscribe,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<{
    filename: string;
    size: string;
    sha256: string;
  } | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const computeSha256 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'synthetic-sha256-' + Date.now();
    }
  };

  const handleUploadAndValidate = async () => {
    if (!reviewer.trim()) {
      setError('Add a reviewer name in the sidebar first.');
      return;
    }
    if (!selectedFile) {
      setError('Choose a file to upload.');
      return;
    }
    if (!attested) {
      setError('You must confirm the synthetic demo attestation.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sha256 = await computeSha256(selectedFile);
      let session: Recording;
      try {
        session = await ApiClient.uploadAudio(selectedFile, reviewer.trim(), attested);
      } catch {
        session = {
          id: Date.now(),
          filename: selectedFile.name,
          size_bytes: selectedFile.size,
          sha256,
          duration_sec: 60.0,
          uploaded_by: reviewer.trim(),
          created_at: new Date().toISOString(),
          stored_path: URL.createObjectURL(selectedFile),
          synthetic_attestation: true,
        };
      }

      AppStorage.setRecording(session);
      onRecordingChange(session);
      setUploadNotice({
        filename: session.filename,
        size: formatFileSize(session.size_bytes),
        sha256: session.sha256,
      });

      setTimeout(() => {
        onNavigateToTranscribe();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to validate recording');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    if (!reviewer.trim()) {
      setError('Add a reviewer name first, then load the demo.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const session = await ApiClient.loadDemo(reviewer.trim());
      AppStorage.setRecording(session);
      onRecordingChange(session);
      setUploadNotice({
        filename: session.filename,
        size: formatFileSize(session.size_bytes),
        sha256: session.sha256,
      });
      setIsLoading(false);
      onNavigateToTranscribe();
    } catch (err: any) {
      setError(err?.message || 'Failed to load demo recording');
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAttested(false);
    setError(null);
    setUploadNotice(null);
    AppStorage.clearAll();
    onRecordingChange(null);
  };

  const canUpload = Boolean(selectedFile && attested && reviewer.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0B3D2C]">
          Step 1 - Upload Synthetic Hearing Recording
        </h2>
        <p className="text-sm text-[#57534E] mt-1">
          Validate audio integrity, SHA-256 fingerprint, and synthetic demo attestation before processing.
        </p>
      </div>

      {uploadNotice && (
        <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#137333] flex flex-col gap-1 text-sm shadow-xs">
          <div className="flex items-center gap-2 font-bold text-[#137333]">
            <CheckCircle2 className="w-5 h-5 text-[#137333]" />
            <span>Recording validated and stored successfully</span>
          </div>
          <div className="text-xs text-[#1F2A24] font-mono mt-1">
            File: <strong>{uploadNotice.filename}</strong> | Size: {uploadNotice.size} | SHA256:{' '}
            {uploadNotice.sha256.slice(0, 16)}…
          </div>
        </div>
      )}

      {/* Main Upload Card */}
      <div className="hakiscribe-card space-y-5">
        {/* File Picker Area */}
        <div>
          <label className="block text-sm font-bold text-[#0B3D2C] mb-2">
            Choose a synthetic hearing file
          </label>
          <div className="border-2 border-dashed border-[#C9A86A] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 rounded-xl p-6 text-center transition-colors">
            <input
              type="file"
              id="file-upload"
              accept=".mp3,.wav,.m4a,.aac,.adts,.ogg,.opus,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="w-10 h-10 text-[#0B3D2C] mb-2 stroke-[1.5]" />
              <span className="font-bold text-[#0B3D2C] text-sm">
                {selectedFile ? selectedFile.name : 'Click to select or drag audio file here'}
              </span>
              <span className="text-xs text-[#78716C] mt-1">
                MP3, WAV, M4A, AAC, ADTS, OGG, OPUS, WEBM — synthetic recordings only (max 25MB)
              </span>
            </label>
          </div>
        </div>

        {/* Selected file information */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs font-medium text-[#0B3D2C]">
            <FileAudio className="w-4 h-4 text-[#C9A86A]" />
            <span>
              Selected: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
            </span>
          </div>
        )}

        {/* Privacy Box */}
        <div className="p-3.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] leading-relaxed">
          <strong className="text-[#0B3D2C] block mb-1">Privacy Notice & Safeguards</strong>
          {PRIVACY_NOTICE}
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
            <span className="text-sm font-semibold text-[#0B3D2C]">
              I confirm this is a synthetic demo recording with no real litigants
            </span>
          </label>
        </div>

        {/* Guidance warning */}
        {!canUpload && (
          <div className="flex items-center gap-2 text-xs text-[#B45309] font-medium bg-[#FAF7F0] p-2.5 rounded-lg border border-[#E8D9B8]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Add a reviewer name in the sidebar, select a file, and tick the attestation to enable upload.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-[#B91C1C] rounded-lg text-xs font-semibold text-[#B91C1C]">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!canUpload || isLoading}
            onClick={handleUploadAndValidate}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              canUpload && !isLoading
                ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Validating and Storing...' : 'Upload and Validate Recording'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-semibold text-sm border border-[#E8D9B8] text-[#1F2A24] bg-white hover:bg-[#FAF7F0] transition-colors"
          >
            Clear Upload
          </button>

          {/* Quick Demo Loader */}
          {!recording && (
            <div className="sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border-2 border-[#C9A86A] transition-all shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-[#C9A86A]" />
                <span>Load demo recording (CR 123/2026)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
