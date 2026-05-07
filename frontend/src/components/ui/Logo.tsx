import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center gap-2 font-bold text-xl tracking-tight ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[--accent-primary]"
      >
        <path
          d="M16 4L28 10V22L16 28L4 22V10L16 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 10L22 13V19L16 22L10 19V13L16 10Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-white">Redon<span className="text-[--accent-primary]">3</span></span>
    </div>
  );
};
