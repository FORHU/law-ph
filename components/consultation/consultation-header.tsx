'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu, Edit2 } from 'lucide-react';

interface ConsultationHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  isEditable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  showSubtitle?: boolean;
}

export function ConsultationHeader({ 
  title = "AI Legal Consultation", 
  subtitle = "Immediate guidance based on Philippine law", 
  onMenuClick,
  showMenuButton = true,
  isEditable = false,
  onTitleChange,
  showSubtitle = true
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
    <header className="relative z-10 border-b border-[#8B4564]/10 bg-[#1A1A1A]/60 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 w-full">
          {showMenuButton && onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="p-2 hover:bg-[#8B4564]/10 rounded-xl transition-all border border-transparent hover:border-[#8B4564]/30 group flex-shrink-0"
              title="Open Sidebar"
            >
              <Menu size={20} className="text-gray-400 group-hover:text-[#E0A7C2]" />
            </button>
          )}
          <button 
            onClick={() => router.push("/")}
            className="p-2 hover:bg-[#8B4564]/10 rounded-xl transition-all border border-transparent hover:border-[#8B4564]/30 group flex-shrink-0"
            title="Go Home"
          >
            <ArrowLeft size={20} className="text-gray-400 group-hover:text-[#E0A7C2]" />
          </button>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-base md:text-lg font-bold text-white tracking-tight focus:outline-none border-b border-[#8B4564]/50 pb-0.5"
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
              <p className="hidden md:block text-[10px] text-gray-500 uppercase tracking-widest font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
