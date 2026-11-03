import React, { useState, useEffect } from 'react';
import { Recording, Segment } from '../../types';

interface SegmentWorkspaceProps {
  segment: Segment;
  recording: Recording;
  hasReviewer: boolean;
  onSaveEdit: (newText: string, reason: string) => void;
}

export const SegmentWorkspace: React.FC<SegmentWorkspaceProps> = ({
  segment,
  recording,
  hasReviewer,
  onSaveEdit,
}) => {
  const [editText, setEditText] = useState(segment.text_current);
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    setEditText(segment.text_current);
    setEditReason('');
  }, [segment.id, segment.text_current]);

  const handleSave = () => {
    if (!hasReviewer) {
      alert('Add your reviewer name in the sidebar before editing.');
      return;
    }
    if (!editReason.trim()) {
      alert('A reason is mandatory for every transcript edit.');
      return;
    }
    if (editText === segment.text_current) {
      alert('No changes detected in text.');
      return;
    }
    onSaveEdit(editText, editReason.trim());
    setEditReason('');
  };

  const isModified = editText !== segment.text_original;

  return (
    <div className="space-y-4">
      {/* Audio Passage Player */}
      <div className="hakiscribe-card space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#0B3D2C] text-[#FAF7F0] font-bold text-xs">
              Segment #{segment.idx}
            </span>
            <span className="text-xs font-bold text-[#0B3D2C]">Passage Audio</span>
          </div>
          <span className="text-xs font-mono text-gray-600">
            Range: {segment.start_sec.toFixed(1)}s – {segment.end_sec.toFixed(1)}s
          </span>
        </div>

        <div className="bg-[#FAF7F0] p-3 rounded-lg border border-[#E8D9B8] flex flex-col gap-2">
          <audio
            controls
            className="w-full h-9 rounded"
            src={recording.stored_path}
          />
          <span className="text-[11px] text-gray-500 italic">
            Jump-to-audio passage preview ({segment.start_sec.toFixed(1)}s to {segment.end_sec.toFixed(1)}s).
          </span>
        </div>
      </div>

      {/* Side-by-Side Text Comparison */}
      <div className="hakiscribe-card space-y-4">
        <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider border-b border-[#E8D9B8] pb-2">
          Original vs. Editable Text
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-[#78716C] uppercase mb-1">
              Original AI Text (Immutable)
            </label>
            <textarea
              readOnly
              disabled
              value={segment.text_original}
              rows={4}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 italic cursor-not-allowed resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0B3D2C] uppercase mb-1">
              Current Text (Human Reviewed)
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              disabled={!hasReviewer}
              rows={4}
              className="w-full p-2.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] font-medium focus:ring-2 focus:ring-[#0B3D2C] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Unified Diff */}
        {isModified && (
          <div className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs font-mono">
            <span className="text-gray-500 block mb-1 font-bold text-[10px] uppercase">
              Unified Diff Preview:
            </span>
            <div className="text-red-700 bg-red-50 p-1 rounded">
              --- Original: {segment.text_original}
            </div>
            <div className="text-green-800 bg-green-50 p-1 rounded mt-1">
              +++ Current: {editText}
            </div>
          </div>
        )}

        {/* Reason for Edit */}
        <div className="pt-2 border-t border-[#E8D9B8] space-y-2">
          <label className="block text-xs font-bold text-[#0B3D2C]">
            Reason for edit <span className="text-[#B91C1C]">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Corrected Swahili spelling / verified bail date from audio"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              disabled={!hasReviewer}
              className="grow px-3 py-2 text-xs bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasReviewer || !editReason.trim() || editText === segment.text_current}
              className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${
                hasReviewer && editReason.trim() && editText !== segment.text_current
                  ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Save edit
            </button>
          </div>
          {!hasReviewer && (
            <p className="text-[11px] text-[#B45309]">
              Enter reviewer name in the sidebar to enable transcript editing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
