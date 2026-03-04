import React from 'react';
import { Mic, Download, X, Square, Edit2, Check, Trash2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from './types';

interface VoiceNoteSectionProps {
  message: Message;
  isRecording?: boolean;
  recordingTime?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  formatTime: (secs: number) => string;
}

export function VoiceNoteSection({ 
  message, 
  isRecording, 
  recordingTime = 0, 
  onStartRecording, 
  onStopRecording, 
  onUpdateMessage,
  formatTime
}: VoiceNoteSectionProps) {
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [confirmDeleteIdx, setConfirmDeleteIdx] = React.useState<number | null>(null);
  const [minimizedNotes, setMinimizedNotes] = React.useState<Set<number>>(new Set());
  const [isAllMinimized, setIsAllMinimized] = React.useState(false);

  const notes = message.voiceNotes || (message.recordingUrl ? [{ id: 'legacy', url: message.recordingUrl }] : []);

  const toggleMinimize = (idx: number) => {
    setMinimizedNotes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAllMinimize = () => {
    if (isAllMinimized) {
      setMinimizedNotes(new Set());
      setIsAllMinimized(false);
    } else {
      setMinimizedNotes(new Set(notes.map((_: any, i: number) => i)));
      setIsAllMinimized(true);
    }
  };

  const handleStartRename = (idx: number, currentLabel: string) => {
    setEditingIdx(idx);
    setEditValue(currentLabel || `Voice Note #${idx + 1}`);
  };

  const handleSaveRename = (idx: number) => {
    if (onUpdateMessage) {
      const updatedNotes = notes.map((note: any, i: number) => 
        i === idx ? { ...note, label: editValue } : note
      );
      onUpdateMessage(message.id, { voiceNotes: updatedNotes });
    }
    setEditingIdx(null);
  };

  const handleDelete = (idx: number) => {
    if (onUpdateMessage) {
      const remaining = notes.filter((_: any, i: number) => i !== idx);
      onUpdateMessage(message.id, {
        voiceNotes: remaining,
        recordingUrl: remaining.length > 0 ? remaining[0].url : undefined
      });
    }
    setConfirmDeleteIdx(null);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Create a sanitized filename
      const safeName = filename.replace(/[^a-z0-9_\-\s]/gi, '').split(' ').join('_').toLowerCase();
      
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${safeName || 'voice-note'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn('CORS or Network issue, falling back to direct download:', error);
      // Fallback: Open in new tab which usually triggers the browser's native download 
      // handle for binary types, or at least shows the file properly.
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      } else {
        // Ultimate fallback: window.location
        window.location.href = url;
      }
    }
  };
  
  return (
    <div className="mt-0 flex flex-col gap-2 w-full max-w-4xl">
      {/* Header with Global Actions */}
      {notes.length > 1 && (
        <div className="flex items-center justify-between px-1 mb-1">
          <button
            onClick={toggleAllMinimize}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-[#E0A7C2] uppercase tracking-wider transition-colors"
          >
            {isAllMinimized ? (
              <><ChevronsUpDown size={12} /> Expand All</>
            ) : (
              <><ChevronsDownUp size={12} /> Minimize All</>
            )}
          </button>
        </div>
      )}

      {/* List existing notes */}
      {notes.map((note: { id: string; url: string; label?: string }, idx: number) => (
        <div key={note.id || idx} className="group p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-2 transition-all hover:border-[#8B4564]/30 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <button 
                onClick={() => toggleMinimize(idx)}
                className="p-1 -ml-1 text-gray-600 hover:text-[#E0A7C2] transition-colors"
              >
                {minimizedNotes.has(idx) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              <Mic size={12} className="text-[#8B4564] flex-shrink-0" />
              {editingIdx === idx ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(idx);
                      if (e.key === 'Escape') setEditingIdx(null);
                    }}
                    onBlur={() => handleSaveRename(idx)}
                    className="flex-1 bg-black/50 border border-[#8B4564]/50 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-[#8B4564]/50 font-inter"
                  />
                  <button 
                    onClick={() => handleSaveRename(idx)}
                    className="p-1 px-2 bg-[#8B4564]/20 rounded text-[#E0A7C2] hover:bg-[#8B4564]/40 transition-colors"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <span 
                    className="text-xs font-semibold text-gray-300 truncate cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleMinimize(idx)}
                  >
                    {note.label || `Voice Note ${notes.length > 1 ? `#${idx + 1}` : ''}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(idx, note.label || `Voice Note #${idx + 1}`);
                    }}
                    className="p-1 text-gray-500 hover:text-[#E0A7C2] transition-all opacity-0 group-hover:opacity-100"
                    title="Rename Recording"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {confirmDeleteIdx === idx ? (
                <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-right-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Delete?</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(idx)}
                      className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-md hover:bg-red-600 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteIdx(null)}
                      className="text-[10px] font-bold text-gray-400 hover:text-white px-1"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    title="Download recording"
                    className="p-1.5 text-gray-500 hover:text-[#E0A7C2] hover:bg-[#8B4564]/10 rounded-lg transition-all"
                    onClick={() => handleDownload(note.url, note.label || `voice-note-${idx + 1}`)}
                  >
                    <Download size={13} />
                  </button>
                  <button
                    title="Delete recording"
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    onClick={() => setConfirmDeleteIdx(idx)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {!minimizedNotes.has(idx) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  <audio 
                    controls 
                    src={note.url} 
                    controlsList="nodownload"
                    className="h-9 w-full custom-audio-player" 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Recording indicator / controls */}
      {isRecording ? (
        <div className="flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-mono font-semibold text-red-400">REC {formatTime(recordingTime)}</span>
          <button
            onClick={onStopRecording}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-md text-xs font-semibold text-red-400 hover:text-white transition-colors"
          >
            <Square size={10} className="fill-red-400" /> Stop
          </button>
        </div>
      ) : (
        <button
          onClick={onStartRecording}
          className="flex items-center gap-2 px-3 py-2 bg-[#8B4564]/10 hover:bg-[#8B4564]/25 border border-[#8B4564]/30 rounded-lg text-xs font-semibold text-[#E0A7C2] hover:text-white transition-colors w-fit"
        >
          <Mic size={13} /> Record Audio Note
        </button>
      )}
    </div>
  );
}
