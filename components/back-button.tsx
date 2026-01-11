'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

interface BackButtonProps {
  label?: string;
  className?: string;
  fallbackHref?: string;
}

export default function BackButton({
  label = 'Back',
  className = '',
  fallbackHref,
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // If user entered directly, router.back() may do nothing
    if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`group flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest ${className}`}
    >
      <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">
        arrow_back
      </span>
      {label}
    </button>
  );
}
