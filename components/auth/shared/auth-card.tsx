'use client';

import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="bg-[#242424]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl mt-12 sm:mt-0">
      {children}
    </div>
  );
}
