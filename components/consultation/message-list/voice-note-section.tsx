import React from 'react';
import { Mic, Download, X, Square } from 'lucide-react';
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
  const notes = message.voiceNotes || (message.recordingUrl ? [{ id: 'legacy', url: message.recordingUrl }] : []);
  
  return (
    <div className="mt-0 flex flex-col gap-2">
      {/* List existing notes */}
      {notes.map((note: { id: string; url: string }, idx: number) => (
        <div key={note.id || idx} className="p-3 bg-black/30 rounded-lg border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Mic size={12}/> Voice Note {notes.length > 1 ? `#${idx + 1}` : ''}
            </span>
            <div className="flex items-center gap-1">
              {/* Download button */}
              <button
                title="Download recording"
                className="p-1 text-gray-500 hover:text-[#E0A7C2] transition-colors"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = note.url;
                  a.download = `voice-note-${idx + 1}.webm`;
                  a.click();
                }}
              >
                <Download size={13} />
              </button>
              {/* Delete button */}
              <button
                title="Delete recording"
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                onClick={() => {
                  if (onUpdateMessage) {
                    const remaining = notes.filter((_: any, i: number) => i !== idx);
                    onUpdateMessage(message.id, {
                      voiceNotes: remaining,
                      recordingUrl: remaining.length > 0 ? remaining[0].url : undefined
                    });
                  }
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
          <audio controls src={note.url} className="h-8 max-w-full" />
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
