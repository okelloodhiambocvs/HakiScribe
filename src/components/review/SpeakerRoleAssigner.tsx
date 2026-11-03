import React, { useState } from 'react';
import { Users, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Segment, SpeakerRole, SpeakerRoleMapping } from '../../types';
import { TAXONOMY_ROLES } from '../../constants/brand';

interface SpeakerRoleAssignerProps {
  segment: Segment;
  currentRoleMapping?: SpeakerRoleMapping;
  hasReviewer: boolean;
  onAssignRole: (speakerLabel: string, role: SpeakerRole, reason?: string) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SpeakerRoleAssigner: React.FC<SpeakerRoleAssignerProps> = ({
  segment,
  currentRoleMapping,
  hasReviewer,
  onAssignRole,
  onNotify,
}) => {
  const [selectedRole, setSelectedRole] = useState<SpeakerRole>(
    (currentRoleMapping?.role as SpeakerRole) || 'MAGISTRATE'
  );
  const [roleReason, setRoleReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAssign = () => {
    if (!hasReviewer) {
      const msg = 'Enter your reviewer name in the left panel before assigning speaker roles.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    setValidationError(null);
    onAssignRole(segment.speaker_label, selectedRole, roleReason.trim() || undefined);
    if (onNotify) {
      onNotify(
        `Assigned role ${selectedRole} to all "${segment.speaker_label}" segments.`,
        'success'
      );
    }
    setRoleReason('');
  };

  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[#C9A86A]" />
          <span>Speaker Court Role Assignment</span>
        </h3>
        <span className="text-[10px] text-[#78716C] font-mono">
          Applies across all turns labeled "{segment.speaker_label}"
        </span>
      </div>

      {validationError && (
        <div className="p-2.5 bg-amber-50 border border-[#B45309] rounded-lg text-xs font-medium text-[#B45309] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="text-xs space-y-3">
        {/* Current status pill */}
        <div className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#78716C] block uppercase font-bold">Diarization Cluster</span>
            <strong className="text-xs text-[#0B3D2C]">{segment.speaker_label}</strong>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#78716C] block uppercase font-bold">Assigned Role</span>
            <strong className="text-xs text-[#0B3D2C] px-2 py-0.5 rounded bg-white border border-[#C9A86A]">
              {currentRoleMapping ? currentRoleMapping.role : 'No role mapped'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#0B3D2C] mb-1">
              Select Judicial Role (Locked Taxonomy)
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as SpeakerRole);
                setValidationError(null);
              }}
              disabled={!hasReviewer}
              className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs font-semibold text-[#0B3D2C] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
            >
              {TAXONOMY_ROLES.filter((r) => r !== 'UNKNOWN').map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
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
            Assign Role Across All Segments
          </button>
          {!hasReviewer && (
            <span className="text-[10px] text-[#B45309]">Enter reviewer name to assign roles</span>
          )}
        </div>
      </div>
    </div>
  );
};
