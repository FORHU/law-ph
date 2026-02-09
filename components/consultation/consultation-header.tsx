'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';

interface ConsultationHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function ConsultationHeader({ 
  title = "AI Legal Consultation", 
  subtitle = "Immediate guidance based on Philippine law", 
  onMenuClick 
}: ConsultationHeaderProps) {
  const router = useRouter();

  return (
    <header className="relative z-10 border-b border-[#8B4564]/20 bg-[#1A1A1A]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-300" />
          </button>
          <button 
            onClick={() => router.push("/")}
            className="hidden md:block p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-300" />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-semibold truncate max-w-[200px] md:max-w-none">{title}</h1>
            <p className="hidden md:block text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
