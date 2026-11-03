import React from 'react';
import { FOOTER_DISCLAIMER } from '../constants/brand';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 pt-6 border-t border-[#E8D9B8] pb-8 text-center">
      <p className="text-xs text-[#57534E] max-w-lg mx-auto font-medium">
        {FOOTER_DISCLAIMER}
      </p>
    </footer>
  );
};
