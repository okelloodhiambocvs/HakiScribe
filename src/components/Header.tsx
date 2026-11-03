import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="pt-6 pb-4">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Brand Logo */}
        <div className="mb-3 hover:scale-105 transition-transform duration-200">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            className="shadow-sm rounded-2xl"
          >
            <title>HakiScribe-AI logo</title>
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
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B3D2C] tracking-tight">
          HakiScribe-AI
        </h1>
        <p className="text-base md:text-lg text-[#1F2A24] font-medium mt-1">
          Clarity in Every Proceeding
        </p>
      </div>
    </header>
  );
};
