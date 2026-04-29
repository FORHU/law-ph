'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, Menu, Edit2 } from 'lucide-react';



interface ConsultationHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  isEditable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  showSubtitle?: boolean;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export function ConsultationHeader({ 
  title = "AI Legal Consultation", 
  subtitle = "Immediate guidance based on Philippine law", 
  onMenuClick,
  showMenuButton = true,
  isEditable = false,
  onTitleChange,
  showSubtitle = true,
  actions,
  onBack,
}: ConsultationHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (editedTitle.trim() !== title) {
      onTitleChange?.(editedTitle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    }
  };

  return (
    <header className="relative z-10 border-b border-white/5 bg-[#0B0B0C]/80 backdrop-blur-md">
      <div className="flex items-center px-2 md:px-4 py-2 md:py-4 gap-2">
        {/* Left: Action Group (Menu + Back) */}
        <div className="flex items-center gap-3.5 md:gap-2 shrink-0">




          {showMenuButton && onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="p-2.5 md:p-2 hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/30 group shrink-0"
              title="Open Sidebar"
            >
              <Menu size={22} className="text-gray-400 group-hover:text-primary md:size-5" />
            </button>
          )}
          <button 
            onClick={onBack || (() => router.push('/consultation'))}
            className="p-2.5 md:p-1.5 hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/30 group shrink-0 relative flex items-center justify-center w-10 h-10 md:w-8 md:h-8"
          >
            <ArrowLeft size={18} className="hidden md:block text-gray-400 group-hover:text-primary absolute" />
            <ChevronLeft size={24} strokeWidth={2.5} className="md:hidden block text-gray-300 group-hover:text-primary absolute" />
          </button>


        </div>

        {/* Center: Title Region */}
        <div className="flex-1 min-w-0">
          <div className="max-w-full">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-base md:text-lg font-bold text-white tracking-tight focus:outline-none border-b border-primary/50 pb-0.5"
              />
            ) : (
              <div 
                className={`flex items-center gap-2 ${isEditable ? 'cursor-pointer group/title' : ''}`}
                onClick={() => isEditable && setIsEditing(true)}
              >
                <h1 className="text-base md:text-lg font-bold text-white tracking-tight truncate">
                  {title}
                </h1>
                {isEditable && (
                  <Edit2 size={14} className="text-gray-600 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                )}
              </div>
            )}
            
            {showSubtitle && (
              <p className="hidden md:block text-[10px] text-gray-400 uppercase tracking-widest font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {actions && (
          <div className="shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
