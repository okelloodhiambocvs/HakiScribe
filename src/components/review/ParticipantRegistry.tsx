import React, { useState } from 'react';
import { Users, ShieldCheck, Trash2, AlertCircle } from 'lucide-react';
import { CourtParticipant, SpeakerRole } from '../../types';
import { TAXONOMY_ROLES, ROLE_DISPLAY_LABELS } from '../../constants/brand';
import { WITNESS_DESIGNATIONS } from '../../../shared/taxonomy';
import { formatParticipantHeading } from '../../../shared/participants';

interface ParticipantRegistryProps {
  participants: CourtParticipant[];
  hasReviewer: boolean;
  onRegister: (
    fullName: string,
    role: SpeakerRole,
    witnessDesignation: string | null,
    description: string | null
  ) => void;
  onVerify: (participant: CourtParticipant) => void;
  onDelete: (participant: CourtParticipant) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ASSIGNABLE_ROLES = TAXONOMY_ROLES.filter((r) => r !== 'UNKNOWN');

export const ParticipantRegistry: React.FC<ParticipantRegistryProps> = ({
  participants,
  hasReviewer,
  onRegister,
  onVerify,
  onDelete,
  onNotify,
}) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SpeakerRole>('WITNESS');
  const [designation, setDesignation] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isWitnessRole = role === 'WITNESS' || role === 'WITNESS_PW1' || role === 'WITNESS_PW2';

  const handleRegister = () => {
    if (!hasReviewer) {
      const msg = 'Enter your reviewer name in the left panel before registering participants.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    if (!fullName.trim()) {
      const msg = 'Participant full name is required.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    setValidationError(null);
    onRegister(
      fullName.trim(),
      role,
      isWitnessRole && designation ? designation : null,
      description.trim() || null
    );
    setFullName('');
    setDesignation('');
    setDescription('');
  };

  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[#C9A86A]" />
          <span>Participant Register ({participants.length})</span>
        </h3>
        <span className="text-[10px] text-[#78716C]">Reviewer-entered identities only</span>
      </div>

      <p className="text-[11px] text-[#57534E] leading-relaxed">
        Register the actual people present in this proceeding. Voices are never identified by AI;
        every name below was entered and must be verified by a human reviewer.
      </p>

      {validationError && (
        <div className="p-2.5 bg-amber-50 border border-[#B45309] rounded-lg text-xs font-medium text-[#B45309] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
            Full Name <span className="text-[#B91C1C]">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setValidationError(null);
            }}
            disabled={!hasReviewer}
            placeholder="e.g. Jane Wanjiku"
            maxLength={120}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">Courtroom Role</label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as SpeakerRole);
              setValidationError(null);
            }}
            disabled={!hasReviewer}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs font-semibold text-[#0B3D2C] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_DISPLAY_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
            Witness Designation {isWitnessRole ? '(optional)' : '(witnesses only)'}
          </label>
          <select
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            disabled={!hasReviewer || !isWitnessRole}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C] disabled:opacity-50"
          >
            <option value="">None</option>
            {WITNESS_DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
            Identifying Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!hasReviewer}
            placeholder="e.g. Counsel holding brief for the accused"
            maxLength={300}
            className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRegister}
        disabled={!hasReviewer}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
          hasReviewer
            ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
        }`}
      >
        Register Participant
      </button>

      <div className="space-y-2 pt-1">
        {participants.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-1">
            No participants registered for this proceeding yet. All voices remain unidentified.
          </p>
        ) : (
          participants.map((p) => (
            <div
              key={p.id}
              className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-[#0B3D2C] truncate">
                  {formatParticipantHeading(p)}
                </div>
                <div className="text-[10px] text-[#78716C] mt-0.5">
                  Registered by {p.created_by}
                  {p.description ? ` Â· ${p.description}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.verified === 1 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    Verified{p.verified_by ? ` Â· ${p.verified_by}` : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onVerify(p)}
                    disabled={!hasReviewer}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white border border-[#137333] text-[#137333] hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Verify Identity
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  disabled={!hasReviewer}
                  title={`Remove ${p.full_name}`}
                  className="p-1.5 bg-white hover:bg-red-50 text-[#B91C1C] border border-red-200 rounded-md disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
