import React from 'react';
import { Mic, MoreHorizontal, Download, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { Message } from './types';

interface VoiceNoteSectionProps {
  message: Message;
  editingNoteLabel: Record<string, string | null>;
  setEditingNoteLabel: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onConfirmDelete: (messageId: string | number, noteId: string, label: string) => void;
}

export function VoiceNoteSection({ 
  message, 
  editingNoteLabel, 
  setEditingNoteLabel, 
  onUpdateMessage,
  onConfirmDelete
}: VoiceNoteSectionProps) {
  // Migrate legacy logic locally for display
  const notes = message.voiceNotes ? [...message.voiceNotes] : [];
  if (message.recordingUrl && notes.length === 0) {
    notes.push({ id: 'legacy-audio', url: message.recordingUrl });
  }

  if (notes.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {notes.map((note, idx) => {
        const labelKey = `${message.id}-${note.id}`;
        const isEditingLabel = editingNoteLabel[labelKey] !== undefined && editingNoteLabel[labelKey] !== null;
        const defaultLabel = note.label || (notes.length > 1 ? `Voice Note #${idx + 1}` : 'Voice Note');

        return (
          <div key={note.id} className="p-3 bg-black/30 rounded-lg border border-white/5 flex flex-col gap-2">
            {/* Label row */}
            <div className="flex items-center gap-1">
              <Mic size={12} className="text-gray-400 flex-shrink-0" />
              {isEditingLabel ? (
                <input
                  autoFocus
                  type="text"
                  value={editingNoteLabel[labelKey] ?? ''}
                  onChange={(e) => setEditingNoteLabel(prev => ({ ...prev, [labelKey]: e.target.value }))}
                  onBlur={() => {
                    const newLabel = editingNoteLabel[labelKey]?.trim() || defaultLabel;
                    if (onUpdateMessage) {
                      const updatedNotes = notes.map(n => n.id === note.id ? { ...n, label: newLabel } : n);
                      onUpdateMessage(message.id, { voiceNotes: updatedNotes });
                    }
                    setEditingNoteLabel(prev => ({ ...prev, [labelKey]: null }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingNoteLabel(prev => ({ ...prev, [labelKey]: null }));
                  }}
                  className="text-xs font-semibold text-gray-200 bg-white/10 border border-[#8B4564]/40 rounded px-2 py-0.5 outline-none focus:border-[#E0A7C2]/60 flex-1"
                />
              ) : (
                <span
                  className="text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-200 transition-colors truncate flex-1"
                  title="Click to rename"
                  onClick={() => setEditingNoteLabel(prev => ({ ...prev, [labelKey]: defaultLabel }))}
                >
                  {defaultLabel}
                </span>
              )}
            </div>
            {/* Audio + action buttons row */}
            <div className="flex items-center gap-2">
              <audio 
                controls 
                controlsList="nodownload noplaybackrate"
                src={note.url} 
                className="h-8 flex-1 min-w-0" 
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 text-gray-400 hover:text-white transition-colors rounded flex-shrink-0">
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1E1E1E] border-white/10">
                  <DropdownMenuItem 
                    className="text-gray-200 focus:text-white focus:bg-white/10 cursor-pointer"
                    onClick={() => {
                      const binary = atob(note.url.split(',')[1]);
                      const mime = note.url.split(',')[0].split(':')[1].split(';')[0];
                      const bytes = new Uint8Array(binary.length);
                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                      const blob = new Blob([bytes], { type: mime });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${defaultLabel.replace(/[^a-z0-9]/gi, '_')}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={14} className="mr-2" />
                    Download Recording
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                    onClick={() => onConfirmDelete(message.id, note.id, defaultLabel)}
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete Recording
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
