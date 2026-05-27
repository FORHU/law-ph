'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, StopCircle, Briefcase, Loader2, Play, Pause, Trash2, Volume2, Plus } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';
import { useAlert } from './alert-provider';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Master state and logic for Case Creation
import { ModalHeader } from './create-case/header';
import { FormField } from './create-case/form-field';
import { TranscriptionButton, AudioRecordButton } from './create-case/recording-buttons';
import { SimpleAudioPlayer } from './create-case/audio-player';
import { MODAL_STYLES, STRINGS } from './create-case/constants';
import { CaseNameInput } from './create-case/case-name-input';
import { PartyInputList } from './create-case/party-input-list';
import { NotesTextarea } from './create-case/notes-textarea';

import { useCaseRecording } from './create-case/use-recording';
import { RecordingControls } from './create-case/recording-controls';

export function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const router = useRouter();
  const { handleCreateCase } = useConversations();
  const { showAlert } = useAlert();

  // Form State
  const [caseName, setCaseName] = useState('');
  const [parties, setParties] = useState<{ id: string, value: string }[]>([{ id: crypto.randomUUID(), value: '' }]);
  const [notes, setNotes] = useState('');


  // Logic State
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

    // Snapshot recordings NOW before any async work clears them
    const recordingsSnapshot = [...recordings];

    setIsSubmitting(true);
    try {
      const partyString = parties.map(p => p.value.trim()).filter(Boolean).join('\n');

      const newCase = await handleCreateCase({
        name: caseName,
        party: partyString,
        notes
      });

      if (newCase) {
        // Upload recordings to S3 (with fallback to blob URL on failure)
        if (recordingsSnapshot.length > 0) {
          const { uploadVoiceNote } = await import('@/lib/s3-utils');

          const voiceNotes = await Promise.all(recordingsSnapshot.map(async (r, i) => {
            try {
              const { file_url, s3_key } = await uploadVoiceNote(r.blob, `case_${newCase.id}_rec_${i + 1}.webm`);
              if (!file_url) throw new Error('No URL returned from uploadVoiceNote');

              return {
                id: r.id,
                url: file_url,
                s3_key: s3_key,
                label: `Recording ${i + 1}`,
                duration: r.duration
              };
            } catch (err: any) {
              console.error(`[CreateCase] Failed to upload recording ${i + 1}:`, err);
              // Fall back to temporary blob URL if upload fails - but warn user
              return {
                id: r.id,
                url: r.url,
                label: `Recording ${i + 1} (Upload Failed)`,
                duration: r.duration
              };
            }
          }));

          const meta = { voiceNotes, recordingUrl: voiceNotes[0]?.url, hidden: true };
          const content = `\uD83C\uDF99\uFE0F ${voiceNotes.length} voice recording${voiceNotes.length > 1 ? 's' : ''} attached to this case.\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;

          const msgRes = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: newCase.id, role: 'user', content }),
          });
          if (!msgRes.ok) {
            console.error('[CreateCase] Failed to store recordings in message:', msgRes.status);
          }
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
      showAlert('Failed to create case. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
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
                        className="p-1.5 hover:bg-[#722f37]/20 rounded-lg text-[#e9c176] transition-colors"
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

                  <FormField label={STRINGS.notesLabel}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <RecordingControls
                        isRecording={isRecording}
                        isAudioRecording={isAudioRecording}
                        duration={duration}
                        onToggleTranscription={toggleTranscription}
                        onToggleAudio={toggleAudioRecording}
                      />
                    </div>
                    <NotesTextarea value={notes} onChange={handleNotesChange} />

                    <div className="space-y-2 mt-2">
                      {recordings.length > 0 && (
                        <p className="text-[11px] font-medium text-gray-400 ml-1 uppercase tracking-wider">{STRINGS.recordingMultiple} ({recordings.length})</p>
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
