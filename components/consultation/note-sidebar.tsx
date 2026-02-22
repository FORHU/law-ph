'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool, Highlighter, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface NoteSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messageText?: string;
  messageId?: string | number;
  onUpdateMessage?: (id: string | number, updates: any) => void;
  highlights?: { id: string, snippet: string, note: string }[];
}

export function NoteSidebar({ 
  isOpen, 
  onClose, 
  messageText, 
  messageId,
  onUpdateMessage,
  highlights = []
}: NoteSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  
  const [selection, setSelection] = useState<{ text: string, rect: DOMRect } | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  
  // Clean text from links before displaying
  const cleanText = messageText ? messageText.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim() : '';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSelection(null);
      setActiveNoteId(null);
    }
  }, [isOpen]);

  const handleSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textRef.current || !sel.toString().trim()) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    // Ensure selection is within the text container
    if (!textRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    
    // Get the container's relative rect to handle floating positioning correctly
    // However, we'll use fixed positioning for the '+' button relative to the viewport
    // as returned by getBoundingClientRect, or relative to the container if we adjust.
    setSelection({
      text: sel.toString().trim(),
      rect: rect
    });
  };

  const addHighlight = () => {
    if (!selection || !messageId || !onUpdateMessage) return;

    const newHighlight = {
      id: Math.random().toString(36).substr(2, 9),
      snippet: selection.text,
      note: ''
    };

    const updatedHighlights = [...highlights, newHighlight];
    onUpdateMessage(messageId, { highlights: updatedHighlights });
    
    setSelection(null);
    setActiveNoteId(newHighlight.id);
    setNoteInput('');
    window.getSelection()?.removeAllRanges();
  };

  const saveNote = (id: string) => {
    if (!messageId || !onUpdateMessage) return;
    const updatedHighlights = highlights.map(h => 
      h.id === id ? { ...h, note: noteInput } : h
    );
    onUpdateMessage(messageId, { highlights: updatedHighlights });
    setActiveNoteId(null);
  };

  const deleteHighlight = (id: string) => {
    if (!messageId || !onUpdateMessage) return;
    const updatedHighlights = highlights.filter(h => h.id !== id);
    onUpdateMessage(messageId, { highlights: updatedHighlights });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:bg-black/40"
          />

          {/* Right Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-[#1A1A1A] border-l border-[#8B4564]/30 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#8B4564]/20 bg-[#252525]/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <PenTool size={18} className="text-[#E0A7C2]" />
                <h3 className="text-sm font-semibold text-white">Sticky Notes</h3>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Note Area */}
            <div className="flex-1 overflow-y-auto relative no-scrollbar bg-[#121212]">
              <div ref={containerRef} className="p-6 pb-24">
                
                {/* Instruction */}
                <div className="mb-8 p-4 bg-[#8B4564]/10 border border-[#8B4564]/20 rounded-xl text-xs text-[#E0A7C2] leading-relaxed flex items-center gap-3">
                  <Highlighter size={16} className="flex-shrink-0" />
                  <span>Select any text in the legal response below to create a persistent sticky note attached to that snippet.</span>
                </div>

                {/* Background Text */}
                <div 
                   ref={textRef}
                   className="prose prose-invert max-w-none text-gray-300 leading-relaxed relative z-0 selection:bg-yellow-500/30"
                   onMouseUp={handleSelection}
                >
                  {cleanText ? (
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
                        h3: ({children}) => <h3 className="text-lg font-bold mb-3 mt-4 text-white">{children}</h3>,
                      }}
                    >
                      {cleanText}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-gray-500 italic text-center mt-20">No message content available to note on.</div>
                  )}
                </div>

                {/* Sticky Notes List */}
                <div className="mt-16 space-y-8">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Active Notes ({highlights.length})</span>
                  </div>
                  
                  {highlights.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-xs text-gray-600 italic">No notes created yet. Start highlighting!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {highlights.map((h) => (
                        <div key={h.id} className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all hover:border-[#8B4564]/30">
                          <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-start gap-3">
                            <div className="w-1 h-full min-h-[40px] bg-yellow-500/50 rounded-full flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs italic text-gray-400 leading-relaxed">"{h.snippet}"</p>
                            </div>
                            <button 
                              onClick={() => deleteHighlight(h.id)}
                              className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="p-4">
                            {activeNoteId === h.id ? (
                              <div className="flex flex-col gap-3">
                                <textarea 
                                  autoFocus
                                  className="w-full bg-black/40 border border-[#8B4564]/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#8B4564] min-h-[100px] resize-none"
                                  value={noteInput}
                                  onChange={(e) => setNoteInput(e.target.value)}
                                  placeholder="What's your takeaway from this part?"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setActiveNoteId(null)} className="px-3 py-1.5 text-xs text-gray-400 font-medium hover:text-white transition-colors">Cancel</button>
                                  <button onClick={() => saveNote(h.id)} className="px-5 py-1.5 text-xs bg-[#8B4564] text-white rounded-lg font-semibold shadow-lg shadow-[#8B4564]/20 hover:bg-[#A35276] transition-all">Save Note</button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="text-sm text-gray-200 cursor-pointer min-h-[24px] hover:text-[#E0A7C2] transition-colors leading-relaxed"
                                onClick={() => {
                                  setActiveNoteId(h.id);
                                  setNoteInput(h.note);
                                }}
                              >
                                {h.note || <span className="text-gray-600 italic flex items-center gap-2"><PenTool size={12}/> Click to add a note...</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Action Button (Floating "+" per user request) */}
              {selection && (
                <div 
                  className="fixed z-[100] animate-in fade-in zoom-in duration-200 pointer-events-none"
                  style={{ 
                    top: selection.rect.top - 50, 
                    left: selection.rect.left + (selection.rect.width / 2) - 20
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addHighlight();
                    }}
                    className="pointer-events-auto p-2.5 bg-[#8B4564] text-white rounded-full shadow-2xl shadow-[#8B4564]/50 hover:bg-[#A35276] transition-transform hover:scale-110 flex items-center justify-center border-2 border-white/20"
                    title="Add Sticky Note"
                  >
                    <PenTool size={20} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4 text-center text-[10px] text-gray-600 border-t border-white/5 bg-[#1A1A1A] uppercase tracking-[0.3em]">
               Persistent Legal Insights
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
