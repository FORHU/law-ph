'use client';

import React, { useRef, useState } from 'react';
import { Send, AlertTriangle, Loader2 } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  suggestedQuestions?: string[];
  onQuestionClick?: (question: string) => void;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  placeholder = "Ask ilovelawyer regarding legal matters...",
  disabled = false,
  suggestedQuestions = [],
  onQuestionClick
}: ChatInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragRef.current = false;
    setIsDragging(true);
    if (sliderRef.current) {
      setStartX(e.pageX - sliderRef.current.offsetLeft);
      setScrollLeft(sliderRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    if (sliderRef.current) {
      const x = e.pageX - sliderRef.current.offsetLeft;
      const walk = (x - startX) * 2; // scroll-fast
      if (Math.abs(walk) > 5) isDragRef.current = true;
      sliderRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleQuestionClick = (q: string) => {
    if (!isDragRef.current) {
      onQuestionClick?.(q);
    }
  };

  return (
    <div className="relative z-10 border-t border-[#8B4564]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
      
      {/* Input Box */}
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-4xl mx-auto">
          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && (
            <div className="mb-3">
              <div 
                ref={sliderRef}
                className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuestionClick(q)}
                    className="whitespace-nowrap px-4 py-2 bg-[#2A2A2A]/40 border border-[#8B4564]/20 rounded-full text-xs text-gray-300 hover:bg-[#8B4564]/20 hover:border-[#8B4564]/40 transition-all flex-shrink-0 select-none"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 md:gap-3">
            <div className="flex-1 relative">
              {/* Note inside textarea area (centered vertically on right) */}
              <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[${COLORS.PRIMARY}] pointer-events-none opacity-60">
                <AlertTriangle size={10} />
                <span>IMAGE ANALYSIS LIMITED</span>
              </div>
              
              <textarea
                id="chat-message-input"
                name="message"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="w-full pl-4 md:pl-5 pr-[180px] py-4 bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl text-sm md:text-base text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-[#8B4564]/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '60px', maxHeight: '160px' }}
                disabled={disabled}
              />
              
            </div>
            <button 
              className={`h-12 w-12 md:h-[60px] md:w-[60px] bg-gradient-to-r from-[${COLORS.PRIMARY}] to-[${COLORS.PRIMARY}] rounded-xl hover:from-[${COLORS.PRIMARY_LIGHT}] hover:to-[${COLORS.PRIMARY_LIGHT}] transition-all flex items-center justify-center flex-shrink-0 mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={onSend}
              disabled={disabled || !value.trim()}
            >
              {disabled ? (
                <Loader2 size={18} className="text-white animate-spin" />
              ) : (
                <Send size={18} className="text-white" />
              )}
            </button>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-1 text-center">
            <p className="text-xs text-gray-500">
              AI can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
