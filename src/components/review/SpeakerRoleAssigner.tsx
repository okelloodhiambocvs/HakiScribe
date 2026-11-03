import React, { useState } from 'react';
import { Segment, SpeakerRole, SpeakerRoleMapping } from '../../types';
import { TAXONOMY_ROLES } from '../../constants/brand';

interface SpeakerRoleAssignerProps {
  segment: Segment;
  currentRoleMapping?: SpeakerRoleMapping;
  hasReviewer: boolean;
  onAssignRole: (speakerLabel: string, role: SpeakerRole, reason?: string) => void;
}

export const SpeakerRoleAssigner: React.FC<SpeakerRoleAssignerProps> = ({
  segment,
  currentRoleMapping,
  hasReviewer,
  onAssignRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<SpeakerRole>(
    (currentRoleMapping?.role as SpeakerRole) || 'MAGISTRATE'
  );
  const [roleReason, setRoleReason] = useState('');

  const handleAssign = () => {
    if (!hasReviewer) {
      alert('Add your reviewer name in the sidebar first.');
      return;
    }
    onAssignRole(segment.speaker_label, selectedRole, roleReason.trim() || undefined);
    setRoleReason('');
  };

  return (
    <div className="hakiscribe-card space-y-3">
      <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider border-b border-[#E8D9B8] pb-2 flex items-center justify-between">
        <span>Speaker Court Role Assignment</span>
        <span className="text-xs text-gray-500 font-mono">
          Applies to all segments with label "{segment.speaker_label}"
        </span>
      </h3>

      <div className="text-xs space-y-3">
        <div className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Diarization Label</span>
            <strong className="text-[#0B3D2C]">{segment.speaker_label}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Current Assignment</span>
            <strong className="text-[#0B3D2C]">
              {currentRoleMapping ? currentRoleMapping.role : 'No role assigned yet'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Select Court Role (Locked Taxonomy)
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as SpeakerRole)}
              disabled={!hasReviewer}
              className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs font-semibold text-[#0B3D2C]"
            >
              {TAXONOMY_ROLES.filter((r) => r !== 'UNKNOWN').map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Reason for assignment</label>
            <input
              type="text"
              placeholder="e.g. Addressed court as Mheshimiwa; read formal charges"
              value={roleReason}
              onChange={(e) => setRoleReason(e.target.value)}
              disabled={!hasReviewer}
              className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs"
            />
          </div>
        </div>

        <button
          onClick={handleAssign}
          disabled={!hasReviewer}
          className="px-4 py-2 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] font-bold rounded-lg text-xs transition-colors"
        >
          Assign role across all segments
        </button>
      </div>
    </div>
  );
};
