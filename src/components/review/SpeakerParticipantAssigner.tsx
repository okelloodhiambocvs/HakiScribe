import React, { useState } from 'react';
import { UserCheck, AlertCircle } from 'lucide-react';
import { CourtParticipant, Segment, SpeakerRoleMapping } from '../../types';
import { formatParticipantHeading, resolveSegmentSpeaker } from '../../../shared/participants';

interface SpeakerParticipantAssignerProps {
  segment: Segment;
  participants: CourtParticipant[];
  speakerRoles: SpeakerRoleMapping[];
  currentRoleMapping?: SpeakerRoleMapping;
  hasReviewer: boolean;
  onAssign: (
    speakerLabel: string,
    participant: CourtParticipant | null,
    confirmed: boolean,
    reason?: string
  ) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SpeakerParticipantAssigner: React.FC<SpeakerParticipantAssignerProps> = ({
  segment,
  participants,
  speakerRoles,
  currentRoleMapping,
  hasReviewer,
  onAssign,
  onNotify,
}) => {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    currentRoleMapping && currentRoleMapping.participant_id !== null
      ? String(currentRoleMapping.participant_id)
      : ''
  );
  const [roleReason, setRoleReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolved = resolveSegmentSpeaker(segment.speaker_label, speakerRoles, participants);
  const selectedParticipant = participants.find((p) => String(p.id) === selectedParticipantId) || null;

  const handleAssign = () => {
    if (!hasReviewer) {
      const msg = 'Enter your reviewer name in the left panel before assigning speaker identities.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    if (selectedParticipant && !confirmed) {
      const msg = 'Explicit confirmation is required: tick the confirmation box to assign this voice.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    setValidationError(null);
    onAssign(segment.speaker_label, selectedParticipant, confirmed, roleReason.trim() || undefined);
    setRoleReason('');
    setConfirmed(false);
  };

  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-[#C9A86A]" />
          <span>Speaker Identity Assignment</span>
        </h3>
        <span className="text-[10px] text-[#78716C] font-mono">
          Applies to all turns labeled "{segment.speaker_label}"
        </span>
      </div>

      <p className="text-[11px] text-[#57534E] leading-relaxed">
        Diarization only detects distinct voices. Select the registered participant speaking here and
        confirm the match â€” the verified name then appears on every turn of this voice.
      </p>

      {validationError && (
        <div className="p-2.5 bg-amber-50 border border-[#B45309] rounded-lg text-xs font-medium text-[#B45309] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs">
        <span className="text-[10px] text-[#78716C] block uppercase font-bold mb-0.5">
          Current Transcript Heading
        </span>
        <strong className="text-xs text-[#0B3D2C]">{resolved.heading}</strong>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
            Registered Participant
          </label>
          <select
            value={selectedParticipantId}
            onChange={(e) => {
              setSelectedParticipantId(e.target.value);
              setConfirmed(false);
              setValidationError(null);
            }}
            disabled={!hasReviewer || participants.length === 0}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs font-semibold text-[#0B3D2C] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C] disabled:opacity-60"
          >
            <option value="">Unidentified â€” clear assignment</option>
            {participants.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {formatParticipantHeading(p)}{p.verified === 1 ? '' : ' (unverified)'}
              </option>
            ))}
          </select>
          {participants.length === 0 && (
            <p className="text-[10px] text-[#78716C] mt-1">
              Register participants above before assigning voices.
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
            Reason / Evidence for Attribution
          </label>
          <input
            type="text"
            placeholder="e.g. Addressed court as Mheshimiwa / read charges"
            value={roleReason}
            onChange={(e) => {
              setRoleReason(e.target.value);
              setValidationError(null);
            }}
            disabled={!hasReviewer}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
          />
        </div>
      </div>

      {selectedParticipant && (
        <label className="flex items-start gap-2 p-2.5 bg-white border border-[#C9A86A] rounded-lg text-xs font-semibold text-[#0B3D2C] cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              setValidationError(null);
            }}
            disabled={!hasReviewer}
            className="mt-0.5 rounded text-[#0B3D2C] focus:ring-[#C9A86A]"
          />
          <span>
            I confirm that the voice labeled "{segment.speaker_label}" belongs to{' '}
            <strong>{formatParticipantHeading(selectedParticipant)}</strong>. This attribution is my
            responsibility as reviewer.
          </span>
        </label>
      )}

      <div className="pt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={handleAssign}
          disabled={!hasReviewer}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
            hasReviewer
              ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          {selectedParticipant ? 'Confirm Assignment Across All Turns' : 'Mark Voice Unidentified'}
        </button>
        {!hasReviewer && (
          <span className="text-[10px] text-[#B45309]">Enter reviewer name to assign identities</span>
        )}
      </div>
    </div>
  );
};
