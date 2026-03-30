'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Send, AlertTriangle, Loader2, MessageSquare, History, GitGraph, Mail, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '@/lib/constants';

interface ChatInputProps {
  onSend: (message: string, file?: File | null, skipAIResponse?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  activeTab?: 'chat' | 'timeline' | 'mindmap' | 'email' | 'schedule' | 'document';
  onTabChange?: (tab: 'chat' | 'timeline' | 'mindmap' | 'email' | 'schedule' | 'document') => void;
  hasMessages?: boolean;
  isCaseMode?: boolean;
}

export function ChatInput({ 
  onSend, 
  placeholder = "Ask ilovelawyer regarding legal matters...",
  disabled = false,
  activeTab = 'chat',
  onTabChange,
  hasMessages = false,
  isCaseMode = false
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((value.trim() || selectedFile) && !disabled) {
      // For attach-only messages (no text), skip the standard AI response to trigger the receipt flow
      const skipAI = !!selectedFile && !value.trim();
      onSend(value, selectedFile, skipAI);
      setValue('');
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("File is too large. Maximum size is 20MB.");
        return;
      }
      setSelectedFile(file);
      
      // If it's an analyze intent, we might want to send immediately if no text
      // However, usually ChatGPT allows you to add text even after clicking the "attach" button.
      // But for "Analyze a legal document", the user said "it should go straight to the chat".
    }
    // Reset input so same file can be selected again
    e.target.value = '';
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


  return (
    <div className="relative z-10 border-t border-[#8B4564]/20 bg-[#1A1A1A]/90 backdrop-blur-sm landscape:border-t-0 landscape:bg-[#1A1A1A]/95">
      
      {/* Input Box */}
      <div className="px-4 md:px-6 py-3 md:py-4 landscape:py-1.5 md:pt-4 pt-2">
        <div className="max-w-4xl mx-auto">
          {hasMessages && (
            <div className="mb-3 landscape:mb-1.5 overflow-hidden">
              <div 
                ref={sliderRef}
                className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <button 
                  onClick={() => onTabChange?.('chat')}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-2 ${
                    activeTab === 'chat' 
                      ? 'bg-[#8B4564]/30 text-[#E0A7C2] border-[#8B4564]/40 shadow-inner' 
                      : 'bg-[#2A2A2A]/40 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <MessageSquare size={14} />
                  Conversation
                </button>

                {isCaseMode && (
                  <>
                    <button 
                      onClick={() => onTabChange?.('timeline')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-2 ${
                        activeTab === 'timeline' 
                          ? 'bg-[#8B4564]/30 text-[#E0A7C2] border-[#8B4564]/40 shadow-inner' 
                          : 'bg-[#2A2A2A]/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <History size={14} />
                      Timeline
                    </button>
                    <button 
                      onClick={() => onTabChange?.('mindmap')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-2 ${
                        activeTab === 'mindmap' 
                          ? 'bg-[#8B4564]/30 text-[#E0A7C2] border-[#8B4564]/40 shadow-inner' 
                          : 'bg-[#2A2A2A]/40 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <GitGraph size={14} />
                      Mind Map
                    </button>
                  </>
                )}

                <button 
                  onClick={() => onTabChange?.('email')}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-2 ${
                    activeTab === 'email' 
                      ? 'bg-[#8B4564]/30 text-[#E0A7C2] border-[#8B4564]/40 shadow-inner' 
                      : 'bg-[#2A2A2A]/40 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Mail size={14} />
                  Send Email
                </button>

                <button 
                  onClick={() => onTabChange?.('schedule')}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-2 ${
                    activeTab === 'schedule' 
                      ? 'bg-[#8B4564]/30 text-[#E0A7C2] border-[#8B4564]/40 shadow-inner' 
                      : 'bg-[#2A2A2A]/40 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Calendar size={14} />
                  Schedule
                </button>
              </div>
            </div>
          )}

          {/* Input Box - Hidden for forms that have their own inputs */}
          {activeTab !== 'mindmap' && activeTab !== 'timeline' && activeTab !== 'email' && activeTab !== 'schedule' && (
            <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Compact Note above input */}
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8B4564] opacity-50 px-4 mb-1 landscape:hidden">
                <AlertTriangle size={10} />
                <span>IMAGE ANALYSIS LIMITED</span>
              </div>

            {/* Attached File Preview */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-3 ml-2 flex items-center gap-2 bg-[#1A1A1A] border border-[#8B4564]/30 rounded-xl pl-3 pr-2 py-2 shadow-lg z-20"
                >
                  <FileText size={16} className="text-[#E0A7C2]" />
                  <span className="text-xs text-white max-w-[200px] truncate">{selectedFile.name}</span>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-full h-5 w-5 flex items-center justify-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-2xl focus-within:border-[#8B4564]/60 transition-all overflow-hidden p-1.5">
              <textarea
                ref={textareaRef}
                id="chat-message-input"
                name="message"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="flex-1 pl-4 pr-2 py-3 bg-transparent text-sm md:text-base text-gray-200 placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] md:min-h-[52px] max-h-[160px] overflow-y-auto font-inter"
                disabled={disabled}
              />
              
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
                className="hidden"
                disabled={disabled}
              />
              

              <button
                type="button"
                title="Attach Document or Media"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="h-9 w-9 md:h-10 md:w-10 rounded-lg transition-all flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-white hover:bg-white/10 mr-1"
                disabled={disabled}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <button 
                className={`h-9 w-9 md:h-10 md:w-10 bg-gradient-to-r from-[#8B4564] to-[#7a3c58] rounded-lg hover:from-[#9D5373] hover:to-[#8B4564] transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleSend}
                disabled={disabled || (!value.trim() && !selectedFile)}
              >
                {disabled ? (
                  <Loader2 size={18} className="text-white animate-spin" />
                ) : (
                  <Send size={18} className="text-white" />
                )}
              </button>

            </div>
          </div>
        )}
          
          {/* Disclaimer */}
          <div className="mt-0.5 text-center hidden md:block landscape:hidden">
            <p className="text-[10px] text-gray-500">
              AI can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
