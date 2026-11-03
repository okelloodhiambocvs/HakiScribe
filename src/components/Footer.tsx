import React from 'react';
import { FOOTER_DISCLAIMER } from '../constants/brand';

interface FooterProps {
  onOpenAbout: () => void;
  onOpenHowItWorks: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout, onOpenHowItWorks }) => {
  return (
    <footer className="mt-12 pt-6 border-t border-[#E8D9B8] pb-8 text-center">

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
