'use client';

import React from 'react';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-[3px] border-[#722f37]/30 border-t-[#e9c176] rounded-full animate-spin" />
      </div>
      {label && (
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
