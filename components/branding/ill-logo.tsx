'use client';

import React from 'react';

export function IllLogo({ className = "w-10 h-10", color = "currentColor" }: { className?: string, color?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Circle Border */}
      <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="4" />
      
      {/* Bold All-Caps "ILL" Staggered */}
      <g stroke={color} strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter">
        {/* "I" - Top Left */}
        <path d="M40 30V50" />
        <path d="M35 30H45" strokeWidth="4" />
        <path d="M35 50H45" strokeWidth="4" />
        
        {/* "L" 1 - Center Staggered */}
        <path d="M50 40V60H60" />
        
        {/* "L" 2 - Bottom Right Staggered */}
        <path d="M60 50V70H70" />
      </g>
    </svg>
  );
}
