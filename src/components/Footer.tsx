import React from 'react';
import { FOOTER_DISCLAIMER, FOOTER_TAGLINE } from '../constants/brand';

interface FooterProps {
  onOpenAbout: () => void;
  onOpenHowItWorks: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout, onOpenHowItWorks }) => {
  return (
    <footer className="mt-12 pt-8 border-t border-[#E8D9B8] pb-10 text-center">
      <div className="flex flex-col items-center justify-center gap-2 mb-4">
        <svg
          width="36"
          height="36"
          viewBox="0 0 64 64"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          className="rounded-lg shadow-xs"
        >
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#0B3D2C" />
          <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#C9A86A" strokeWidth="2" />
          <g fill="#C9A86A">
            <rect x="15" y="24" width="5" height="16" rx="2.5" />
            <rect x="24" y="19" width="5" height="26" rx="2.5" />
            <rect x="35" y="19" width="5" height="26" rx="2.5" />
            <rect x="44" y="24" width="5" height="16" rx="2.5" />
          </g>
          <rect x="29.5" y="14" width="5" height="36" rx="2.5" fill="#FAF7F0" />
        </svg>
        <div className="text-lg font-bold text-[#0B3D2C]">HakiScribe-AI</div>
        <div className="text-sm text-[#78716C] font-medium">{FOOTER_TAGLINE}</div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={onOpenAbout}
          className="px-4 py-2 rounded-lg bg-[#FFFFFF] border border-[#C9A86A] text-[#0B3D2C] hover:bg-[#FAF7F0] font-semibold text-sm transition-colors shadow-xs"
        >
          About Us
        </button>
        <button
          onClick={onOpenHowItWorks}
          className="px-4 py-2 rounded-lg bg-[#FFFFFF] border border-[#C9A86A] text-[#0B3D2C] hover:bg-[#FAF7F0] font-semibold text-sm transition-colors shadow-xs"
        >
          How It Works
        </button>
      </div>

      <p className="text-xs text-[#57534E] max-w-lg mx-auto font-medium">
        {FOOTER_DISCLAIMER}
      </p>
    </footer>
  );
};
