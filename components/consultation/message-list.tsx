import React, { useState } from 'react';
import { Trash2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, MessageListProps } from './message-list/types';
import { MessageItem } from './message-list/message-item';

export function MessageList({ messages, onDelete, onSourceClick, onCaseClick, onUpdateMessage, onOpenNote }: MessageListProps) {
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});
  const [isRecording, setIsRecording] = useState<Record<string | number, boolean>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string | number, boolean>>({});
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<BlobPart[]>([]);
  const [editingNoteLabel, setEditingNoteLabel] = useState<Record<string, string | null>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ messageId: string | number; noteId: string; label: string } | null>(null);

  const handleTabChange = (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));
  };

  const scrollToMessage = (id: string | number) => {
    setTimeout(() => {
      document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const recordingMessageId = Object.entries(isRecording).find(([_, active]) => active)?.[0];

  return (
    <div className="space-y-4 relative">
      <AnimatePresence>
        {recordingMessageId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-[60] flex justify-center pt-2 pointer-events-none"
          >
            <div className="bg-[#1E1E1E]/90 backdrop-blur-md border border-red-500/30 rounded-full px-4 py-2 shadow-2xl shadow-red-500/20 flex items-center gap-3 pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-white text-xs font-bold tracking-tight uppercase">Recording...</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => {
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                  }
                  setIsRecording(prev => ({...prev, [recordingMessageId]: false}));
                  if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = null;
                    navigator.mediaSession.playbackState = 'none';
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
              >
                <StopCircle size={12} className="fill-current" />
                Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {messages.map((message) => (
        <MessageItem 
          key={message.id}
          message={message}
          activeTab={activeTabs[message.id] || 'answer'}
          onTabChange={(tab) => handleTabChange(message.id, tab)}
          showOriginal={showOriginal[message.id] || false}
          onToggleOriginal={() => setShowOriginal(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
          isRecording={isRecording[message.id] || false}
          onStartStopRecording={async () => {
            if (!isRecording[message.id]) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
                });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                  audioChunksRef.current.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64data = reader.result as string;
                    if (onUpdateMessage) {
                      const currentNotes = message.voiceNotes || [];
                      onUpdateMessage(message.id, { 
                        voiceNotes: [...currentNotes, { id: `audio-${Date.now()}`, url: base64data }],
                        recordingUrl: undefined 
                      });
                    }
                  };
                  reader.readAsDataURL(audioBlob);
                  stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start();
                setIsRecording(prev => ({...prev, [message.id]: true}));
                
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Voice Recording',
                    artist: 'ilovelawyer',
                    album: 'Consultation'
                  });
                  navigator.mediaSession.playbackState = 'playing';
                }
              } catch (err) {
                console.error("Microphone error:", err);
                alert("Could not access microphone.");
              }
            } else {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
              setIsRecording(prev => ({...prev, [message.id]: false}));
              if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.playbackState = 'none';
              }
            }
          }}
          editingNoteLabel={editingNoteLabel}
          setEditingNoteLabel={setEditingNoteLabel}
          onDelete={onDelete}
          onSourceClick={onSourceClick}
          onCaseClick={onCaseClick}
          onUpdateMessage={onUpdateMessage}
          onOpenNote={onOpenNote}
          onConfirmDeleteVoiceNote={(mId, nId, label) => setConfirmDelete({ messageId: mId, noteId: nId, label })}
          scrollToMessage={scrollToMessage}
        />
      ))}

      {/* Reusable confirmation modal for deleting voice notes */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Recording?</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Are you sure you want to delete <span className="text-[#E0A7C2] font-semibold">"{confirmDelete.label}"</span>? 
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 w-full pt-2">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateMessage) {
                        const message = messages.find(m => m.id === confirmDelete.messageId);
                        if (message && message.voiceNotes) {
                          const updatedNotes = message.voiceNotes.filter(n => n.id !== confirmDelete.noteId);
                          onUpdateMessage(message.id, { voiceNotes: updatedNotes });
                        }
                      }
                      setConfirmDelete(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
