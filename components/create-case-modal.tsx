'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, StopCircle, Briefcase, Loader2, Play, Pause, Trash2, Volume2, Sparkles, History, Plus } from 'lucide-react';
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
import { CaseNameInput } from './create-case/case-name-input';
import { PartyInputList } from './create-case/party-input-list';
import { NotesTextarea } from './create-case/notes-textarea';

import { useCaseRecording } from './create-case/use-recording';
import { RecordingControls } from './create-case/recording-controls';

export function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const router = useRouter();
  const { handleCreateCase } = useConversations();
  
  // Form State
  const [caseName, setCaseName] = useState('');
  const [parties, setParties] = useState<{ id: string, value: string }[]>([{ id: crypto.randomUUID(), value: '' }]);
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  
  // Logic State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Recording Hook
  const {
    isRecording,
    isAudioRecording,
    recordings,
    duration,
    transcript,
    toggleTranscription,
    toggleAudioRecording,
    removeRecording,
    clearRecordings
  } = useCaseRecording();

  const partyInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Update notes if transcript is available
  useEffect(() => {
    if (transcript) {
      setNotes(prev => {
        const newNotes = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript.trim();
        return newNotes;
      });
    }
  }, [transcript]);

  // Memoized handlers
  const handleCaseNameChange = React.useCallback((val: string) => setCaseName(val), []);
  const handleNotesChange = React.useCallback((val: string) => setNotes(val), []);
  const handleUpdateParty = React.useCallback((id: string, value: string) => {
    setParties(prev => prev.map(p => p.id === id ? { ...p, value } : p));
  }, []);
  const handleRemoveParty = React.useCallback((id: string) => {
    setParties(prev => {
      if (prev.length <= 1) return [{ id: crypto.randomUUID(), value: '' }];
      return prev.filter(p => p.id !== id);
    });
  }, []);

  const addParty = () => {
    setParties(prev => [...prev, { id: crypto.randomUUID(), value: '' }]);
    setTimeout(() => {
      const lastInput = partyInputsRef.current[partyInputsRef.current.length - 1];
      lastInput?.focus();
    }, 0);
  };

  const handlePartyKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === parties.length - 1 && parties[index].value.trim()) {
        addParty();
      } else if (index < parties.length - 1) {
        partyInputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim() || isRecording || isAudioRecording) return;
    
    setIsSubmitting(true);
    try {
      const partyString = parties.map(p => p.value.trim()).filter(Boolean).join(', ');
      
      const newCase = await handleCreateCase({ 
        name: caseName, 
        party: partyString, 
        notes 
      });

      if (newCase) {
        // Upload recordings
        const { uploadVoiceNote } = await import('@/lib/s3-utils');
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const voiceNotes = await Promise.all(recordings.map(async (r, i) => {
          const s3Url = await uploadVoiceNote(r.blob, `case_${newCase.id}_rec_${i}.webm`);
          return { id: r.id, url: s3Url, label: `Recording ${i + 1}` };
        }));

        if (voiceNotes.length > 0) {
          const meta = { voiceNotes, recordingUrl: voiceNotes[0].url };
          const content = `New case recordings attached.\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;
          
          await supabase.from('messages').insert({
            conversation_id: newCase.id,
            content,
            sender: 'user',
          });
        }

        onClose();
        setCaseName('');
        setParties([{ id: crypto.randomUUID(), value: '' }]);
        setNotes('');
        clearRecordings();
        router.push('/cases/' + newCase.id);
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSummarize = async () => {
    if (!notes.trim() || isSummarizing) return;
    const currentNotes = notes;
    setOriginalNotes(currentNotes);
    setIsSummarizing(true);
    setNotes('');
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: `[STRICT SUMMARY] Summarize concisely: ${currentNotes}`,
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
      setOriginalNotes(current);
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
                <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">{STRINGS.description}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label={STRINGS.caseNameLabel}>
                    <CaseNameInput value={caseName} onChange={handleCaseNameChange} />
                  </FormField>

                  <FormField 
                    label={STRINGS.partyLabel}
                    rightElement={
                      <button 
                        type="button" 
                        onClick={addParty}
                        className="p-1.5 hover:bg-[#8B4564]/20 rounded-lg text-[#E0A7C2] transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    }
                  >
                    <PartyInputList 
                      parties={parties}
                      onUpdate={handleUpdateParty}
                      onRemove={handleRemoveParty}
                      onKeyDown={handlePartyKeyDown}
                      inputRefs={partyInputsRef}
                    />
                  </FormField>

                  <FormField 
                    label={STRINGS.notesLabel} 
                    rightElement={
                      <RecordingControls 
                        isRecording={isRecording} 
                        isAudioRecording={isAudioRecording} 
                        duration={duration} 
                        onToggleTranscription={toggleTranscription} 
                        onToggleAudio={toggleAudioRecording} 
                      />
                    }
                  >
                    <NotesTextarea value={notes} onChange={handleNotesChange} isSummarizing={isSummarizing} />
                    
                    <AISummarizerControls 
                      onSummarize={handleSummarize}
                      onRestoreOriginal={handleRestoreOriginal}
                      isSummarizing={isSummarizing}
                      hasNotes={!!notes.trim()}
                      hasOriginalNotes={originalNotes !== null}
                      isShowingSummary={originalNotes !== null && notes.length < (originalNotes?.length || 0)}
                    />
                    
                    <div className="space-y-2 mt-2">
                      {recordings.length > 0 && (
                        <p className="text-[11px] font-medium text-gray-400 ml-1 uppercase tracking-wider">{STRINGS.recordingMultiple}</p>
                      )}
                      <AnimatePresence>
                        {recordings.map((rec) => (
                          <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <SimpleAudioPlayer 
                              url={rec.url} 
                              onDiscard={() => removeRecording(rec.id)} 
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className={MODAL_STYLES.buttonCancel}>{STRINGS.cancelBtn}</button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !caseName.trim() || isRecording || isAudioRecording}
                      className={MODAL_STYLES.buttonSubmit}
                    >
                      {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (isRecording || isAudioRecording) ? (
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                           Recording...
                        </div>
                      ) : (
                        STRINGS.createBtn
                      )}
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
