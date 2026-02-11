'use client';

import React from 'react';
import { Send, AlertTriangle, Loader2 } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  placeholder = "Ask ilovelawyer regarding legal matters...",
  disabled = false
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative z-10 border-t border-[#8B4564]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
      {/* Warning Banner */}
      <div className={`px-4 md:px-6 py-2 bg-gradient-to-r from-[${COLORS.PRIMARY}]/10 to-transparent border-b border-[#8B4564]/20`}>
        <div className={`max-w-4xl mx-auto flex items-center gap-2 text-[10px] md:text-xs text-[${COLORS.PRIMARY}]`}>
          <AlertTriangle size={12} className="shrink-0" />
          <span className="truncate">NOTE: IMAGE ANALYSIS IS CURRENTLY LIMITED</span>
        </div>
      </div>

      {/* Input Box */}
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 md:gap-3">
            <div className="flex-1 relative">
              <textarea
                id="chat-message-input"
                name="message"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="w-full px-4 md:px-5 py-2.5 md:py-3.5 bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl text-sm md:text-base text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-[#8B4564]/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={disabled}
              />
            </div>
            <button 
              className={`h-12 w-12 md:h-14 md:w-14 bg-gradient-to-r from-[${COLORS.PRIMARY}] to-[${COLORS.PRIMARY}] rounded-xl hover:from-[${COLORS.PRIMARY_LIGHT}] hover:to-[${COLORS.PRIMARY_LIGHT}] transition-all flex items-center justify-center flex-shrink-0 mb-0.5 md:mb-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
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
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              AI can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
