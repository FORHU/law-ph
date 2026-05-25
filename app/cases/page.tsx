'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Briefcase } from 'lucide-react';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { PageLayout } from '@/components/ui/page-layout';
import { CaseNameInput } from '@/components/create-case/case-name-input';
import { PartyInputList } from '@/components/create-case/party-input-list';
import { NotesTextarea } from '@/components/create-case/notes-textarea';
import { RecordingControls } from '@/components/create-case/recording-controls';
import { SimpleAudioPlayer } from '@/components/create-case/audio-player';
import { useCaseRecording } from '@/components/create-case/use-recording';
import { MODAL_STYLES, STRINGS } from '@/components/create-case/constants';

export default function CasesPage() {
  const router = useRouter();
  const { handleCreateCase } = useConversations();

  const [caseName, setCaseName] = useState('');
  const [parties, setParties] = useState<{ id: string; value: string }[]>([
    { id: crypto.randomUUID(), value: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    isRecording, isAudioRecording, recordings, duration, transcript,
    toggleTranscription, toggleAudioRecording, removeRecording, clearRecordings,
  } = useCaseRecording();

  const partyInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (transcript) {
      setNotes((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript.trim());
    }
  }, [transcript]);

  const handleCaseNameChange = React.useCallback((val: string) => setCaseName(val), []);
  const handleNotesChange = React.useCallback((val: string) => setNotes(val), []);

  const handleUpdateParty = React.useCallback((id: string, value: string) => {
    setParties((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  }, []);

  const handleRemoveParty = React.useCallback((id: string) => {
    setParties((prev) => {
      if (prev.length <= 1) return [{ id: crypto.randomUUID(), value: '' }];
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const addParty = () => {
    setParties((prev) => [...prev, { id: crypto.randomUUID(), value: '' }]);
    setTimeout(() => {
      partyInputsRef.current[partyInputsRef.current.length - 1]?.focus();
    }, 0);
  };

  const handlePartyKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === parties.length - 1 && parties[index].value.trim()) addParty();
      else if (index < parties.length - 1) partyInputsRef.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim() || isRecording || isAudioRecording) return;
    const recordingsSnapshot = [...recordings];
    setIsSubmitting(true);
    try {
      const partyString = parties.map((p) => p.value.trim()).filter(Boolean).join('\n');
      const newCase = await handleCreateCase({ name: caseName, party: partyString, notes });
      if (newCase) {
        if (recordingsSnapshot.length > 0) {
          const { uploadVoiceNote } = await import('@/lib/s3-utils');
          const voiceNotes = await Promise.all(
            recordingsSnapshot.map(async (r, i) => {
              try {
                const { file_url, s3_key } = await uploadVoiceNote(r.blob, `case_${newCase.id}_rec_${i + 1}.webm`);
                if (!file_url) throw new Error('No URL');
                return { id: r.id, url: file_url, s3_key, label: `Recording ${i + 1}`, duration: r.duration };
              } catch {
                return { id: r.id, url: r.url, label: `Recording ${i + 1} (Upload Failed)`, duration: r.duration };
              }
            })
          );
          const meta = { voiceNotes, recordingUrl: voiceNotes[0]?.url, hidden: true };
          const content = `🎙️ ${voiceNotes.length} voice recording${voiceNotes.length > 1 ? 's' : ''} attached.\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;
          await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: newCase.id, role: 'user', content }),
          });
        }
        setCaseName(''); setNotes(''); clearRecordings();
        setParties([{ id: crypto.randomUUID(), value: '' }]);
        router.push('/cases/' + newCase.id);
      }
    } catch {
      alert('Failed to create case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      activePage="cases"
      title="Case"
      subtitle="Record case details, parties, and initial notes"
      maxWidth="max-w-7xl"
      backgroundAngle={2}
    >
      <div className="flex-1 flex overflow-hidden">
        <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden p-6 gap-5">

          {/* LEFT — Case info, fixed width, full height */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3 min-h-0">
            <div className="flex-1 bg-[#0B0B0C]/80 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl shadow-2xl flex flex-col min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-[#722f37]/10 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#722f37]/20 border border-[#722f37]/30 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={13} className="text-[#e9c176]" />
                </div>
                <span className="text-xl font-serif text-white tracking-tight">Case Information</span>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={MODAL_STYLES.label}>{STRINGS.caseNameLabel}</label>
                  <CaseNameInput value={caseName} onChange={handleCaseNameChange} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className={MODAL_STYLES.label}>{STRINGS.partyLabel}</label>
                    <button
                      type="button"
                      onClick={addParty}
                      className="w-6 h-6 flex items-center justify-center hover:bg-[#722f37]/20 rounded-lg text-[#e9c176] transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <PartyInputList
                    parties={parties}
                    onUpdate={handleUpdateParty}
                    onRemove={handleRemoveParty}
                    onKeyDown={handlePartyKeyDown}
                    inputRefs={partyInputsRef}
                  />
                </div>
              </div>
            </div>

            {/* Submit — fixed at bottom, never grows */}
            <button
              type="submit"
              disabled={isSubmitting || !caseName.trim() || isRecording || isAudioRecording}
              className="flex-shrink-0 w-full px-4 py-2.5 bg-[#722f37] hover:bg-[#8B3A44] text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-[13px] uppercase tracking-wider"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isRecording || isAudioRecording ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording...
                </span>
              ) : STRINGS.createBtn}
            </button>
          </div>

          {/* RIGHT — Transcript / Notes, same full height */}
          <div className="flex-1 bg-[#0B0B0C]/80 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl shadow-2xl flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#722f37]/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-serif text-white tracking-tight">Transcript / Notes</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-widest hidden sm:block">— type or record</span>
              </div>
              <RecordingControls
                isRecording={isRecording}
                isAudioRecording={isAudioRecording}
                duration={duration}
                onToggleTranscription={toggleTranscription}
                onToggleAudio={toggleAudioRecording}
              />
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-3">
              <div className="flex-1 min-h-0 [&>div]:h-full [&_textarea]:h-full [&_textarea]:resize-none">
                <NotesTextarea value={notes} onChange={handleNotesChange} />
              </div>
              <AnimatePresence>
                {recordings.map((rec) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex-shrink-0"
                  >
                    <SimpleAudioPlayer url={rec.url} onDiscard={() => removeRecording(rec.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </form>
      </div>
    </PageLayout>
  );
}
