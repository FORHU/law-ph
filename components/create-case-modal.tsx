'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, StopCircle, Briefcase, Loader2, Play, Pause, Trash2, Volume2, Sparkles, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Master state and logic for Case Creation
import { ModalHeader } from './create-case/header';
import { FormField } from './create-case/form-field';
import { TranscriptionButton, AudioRecordButton } from './create-case/recording-buttons';
import { SimpleAudioPlayer } from './create-case/audio-player';
import { AISummarizerControls } from './create-case/ai-summarizer';
import { MODAL_STYLES, STRINGS } from './create-case/constants';

export function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const router = useRouter();
  const { handleCreateCase } = useConversations();
  const [caseName, setCaseName] = useState('');
  const [partyInvolved, setPartyInvolved] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false); // Speech-to-text
  const [isAudioRecording, setIsAudioRecording] = useState(false); // Raw audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + transcript;
          }
        }

        if (finalTranscript) {
          console.log('Transcription final result:', finalTranscript);
          setNotes(prev => {
            const newNotes = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript.trim();
            return newNotes;
          });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // These are common and don't need to be treated as critical failures
          console.log(`Speech recognition ${event.error} (handled)`);
          return;
        }
        
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access is denied. Please allow microphone access in your browser settings to use speech-to-text.');
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
    } else {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setIsRecording(false);
      }
    }
  };

  const toggleAudioRecording = async () => {
    if (isAudioRecording) {
      setIsAudioRecording(false);
      mediaRecorderRef.current?.stop();
    } else {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsAudioRecording(true);
      } catch (err) {
        console.error('Failed to start audio recording:', err);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newCase = await handleCreateCase({ name: caseName, party: partyInvolved, notes });
      onClose();
      setCaseName('');
      setPartyInvolved('');
      setNotes('');
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      
      if (newCase) {
        router.push('/cases/' + newCase.id);
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSummarize = async () => {
    if (!notes.trim() || isSummarizing) return;
    
    // Save current as original before summarizing
    const currentNotes = notes;
    setOriginalNotes(currentNotes);
    setIsSummarizing(true);
    setNotes(''); // Clear to show streaming summary
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: `[STRICT SUMMARY] Summarize the following legal notes/transcript concisely into a professional case summary: ${currentNotes}`,
          session_id: `summarize_${Date.now()}`,
        })
      });

      if (!response.ok) throw new Error("Failed to summarize");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          let chunk = decoder.decode(value, { stream: true });
          if (chunk.includes("__END__")) chunk = chunk.replace("__END__", "");
          if (chunk.startsWith("[Tool]") || chunk.startsWith("[Error]")) continue;
          
          accumulatedText += chunk;
          setNotes(accumulatedText);
        }
      }
    } catch (error) {
      console.error("Summarization error:", error);
      alert("Failed to summarize notes. Restoring original.");
      setNotes(currentNotes);
      setOriginalNotes(null);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalNotes !== null) {
      const current = notes;
      setNotes(originalNotes);
      setOriginalNotes(current); // Allow toggling back and forth
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className={MODAL_STYLES.overlay}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className={MODAL_STYLES.backdrop}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={MODAL_STYLES.container}
            >
              <div className={MODAL_STYLES.content} onClick={(e) => e.stopPropagation()}>
                <ModalHeader title={STRINGS.title} onClose={onClose} />

                <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
                  {STRINGS.description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label={STRINGS.caseNameLabel}>
                    <input
                      required
                      type="text"
                      value={caseName}
                      onChange={e => setCaseName(e.target.value)}
                      placeholder={STRINGS.caseNamePlaceholder}
                      className={MODAL_STYLES.input}
                    />
                  </FormField>

                  <FormField label={STRINGS.partyLabel}>
                    <input
                      type="text"
                      value={partyInvolved}
                      onChange={e => setPartyInvolved(e.target.value)}
                      placeholder={STRINGS.partyPlaceholder}
                      className={MODAL_STYLES.input}
                    />
                  </FormField>

                  <FormField 
                    label={STRINGS.notesLabel} 
                    rightElement={
                      <div className="flex gap-2">
                        <AudioRecordButton isRecording={isAudioRecording} onClick={toggleAudioRecording} />
                        <TranscriptionButton isRecording={isRecording} onClick={toggleRecording} />
                      </div>
                    }
                  >
                    <div className="relative group">
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={STRINGS.notesPlaceholder}
                        rows={5}
                        className={MODAL_STYLES.textarea}
                      />
                      {isSummarizing && (
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                          <Loader2 size={24} className="text-[#8B4564] animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <AISummarizerControls 
                      onSummarize={handleSummarize}
                      onRestoreOriginal={handleRestoreOriginal}
                      isSummarizing={isSummarizing}
                      hasNotes={!!notes.trim()}
                      hasOriginalNotes={originalNotes !== null}
                      isShowingSummary={originalNotes !== null && notes.length < (originalNotes?.length || 0)}
                    />
                    
                    {audioUrl && (
                      <SimpleAudioPlayer 
                        url={audioUrl} 
                        onDiscard={() => {
                          URL.revokeObjectURL(audioUrl);
                          setAudioUrl(null);
                        }} 
                      />
                    )}
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className={MODAL_STYLES.buttonCancel}>
                      {STRINGS.cancelBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !caseName.trim()}
                      className={MODAL_STYLES.buttonSubmit}
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : STRINGS.createBtn}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
