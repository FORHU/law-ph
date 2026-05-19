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
    <header className="relative z-10 border-b border-white/5 bg-[#0B0B0C]/40 backdrop-blur-lg">
      <div className="flex items-center px-4 md:px-5 py-1 gap-2.5">
        {/* Left: Action Group (Menu + Back) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showMenuButton && onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="p-1.5 hover:bg-white/5 rounded-md transition-all border border-transparent hover:border-white/10 group shrink-0"
              title="Open Sidebar"
            >
              <Menu size={16} className="text-gray-500 group-hover:text-white" />
            </button>
          )}
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-white/5 rounded-md transition-all border border-transparent hover:border-white/10 group shrink-0 relative flex items-center justify-center w-8 h-8"
            >
              <ArrowLeft size={14} className="text-gray-500 group-hover:text-white" />
            </button>
          )}
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
                className="w-full bg-transparent text-2xl md:text-3xl font-serif font-medium text-white tracking-tight focus:outline-none border-b border-[#722f37]/50 pb-0.5"
              />
            ) : (
              <div 
                className={`flex items-center gap-2 ${isEditable ? 'cursor-pointer group/title' : ''}`}
                onClick={() => isEditable && setIsEditing(true)}
              >
                <span className="text-2xl md:text-3xl font-serif font-medium text-white tracking-tight truncate antialiased">
                  {title}
                </span>
                {isEditable && (
                  <Edit2 size={10} className="text-gray-600 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                )}
              </div>
            )}
            
            {showSubtitle && (
              <p className="hidden md:block text-[11px] text-gray-600 uppercase tracking-[0.25em] font-black mt-1">
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
