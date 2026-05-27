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
import { useAlert } from '@/components/alert-provider';

export default function CasesPage() {
  const router = useRouter();
  const { handleCreateCase } = useConversations();
  const { showAlert } = useAlert();

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
      showAlert('Failed to create case. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButton = (
    <button
      type="submit"
      disabled={isSubmitting || !caseName.trim() || isRecording || isAudioRecording}
      className="w-full px-4 py-3 bg-[#722f37] hover:bg-[#8B3A44] text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-[13px] uppercase tracking-wider flex-shrink-0"
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
  );

  return (
    <PageLayout
      activePage="cases"
      title="Case"
      subtitle="Record case details, parties, and initial notes"
      maxWidth="max-w-7xl"
      backgroundAngle={2}
    >
      {/*
        Mobile  : full-height scroll, panels stacked, button pinned at bottom
        Desktop : two columns side-by-side, button inside left column
      */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 md:p-6 gap-3 md:gap-5"
      >

        {/* ── Panels ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-5 min-h-0 overflow-y-auto md:overflow-hidden">

          {/* LEFT — Case information */}
          <div className="w-full md:w-80 md:flex-shrink-0 flex flex-col gap-3 md:min-h-0">

            <div className="bg-[#0B0B0C]/80 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden md:flex-1">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#722f37]/10 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#722f37]/20 border border-[#722f37]/30 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={13} className="text-[#e9c176]" />
                </div>
                <span className="text-lg sm:text-xl font-serif text-white tracking-tight">Case Information</span>
              </div>

              {/* Body */}
              <div className="overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4 flex flex-col gap-4">
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

            {/* Submit — inside left column on desktop only */}
            <div className="hidden md:block">{submitButton}</div>
          </div>

          {/* RIGHT — Transcript / Notes */}
          <div className="flex-1 min-h-[220px] md:min-h-0 bg-[#0B0B0C]/80 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#722f37]/10 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="text-lg sm:text-xl font-serif text-white tracking-tight truncate">Transcript / Notes</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-widest hidden lg:block flex-shrink-0">— type or record</span>
              </div>
              <RecordingControls
                isRecording={isRecording}
                isAudioRecording={isAudioRecording}
                duration={duration}
                onToggleTranscription={toggleTranscription}
                onToggleAudio={toggleAudioRecording}
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4 flex flex-col gap-3 min-h-0">
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
        </div>

        {/* ── Submit button — mobile only, pinned at bottom ────── */}
        <div className="md:hidden flex-shrink-0">{submitButton}</div>

      </form>
    </PageLayout>
  );
}
