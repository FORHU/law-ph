'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, StopCircle, Briefcase, Loader2 } from 'lucide-react';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODAL_STYLES = {
  overlay: "fixed inset-0 z-[100] flex items-center justify-center p-4",
  backdrop: "absolute inset-0 bg-black/60 backdrop-blur-sm",
  container: "relative w-full max-w-2xl bg-[#1A1A1A] border border-[#8B4564]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
  content: "p-5 md:p-6 overflow-y-auto custom-scrollbar",
  input: "w-full px-4 py-2.5 bg-black/40 border border-[#8B4564]/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#8B4564] transition-all text-[13px]",
  textarea: "w-full px-4 py-3 bg-black/40 border border-[#8B4564]/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#8B4564] transition-all resize-none text-[13px]",
  label: "block text-[13px] font-medium text-gray-400 mb-1.5 font-inter",
  buttonCancel: "flex-1 px-4 py-2.5 border border-[#8B4564]/30 rounded-xl text-gray-400 hover:bg-white/5 transition-all font-medium text-[13px]",
  buttonSubmit: "flex-[1.5] px-4 py-2.5 bg-[#8B4564] text-white rounded-xl hover:bg-[#A05273] transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-[13px]"
};

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-[#8B4564]/20 rounded-lg text-[#E0A7C2]">
        <Briefcase size={18} />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
      <X size={20} />
    </button>
  </div>
);

const FormField = ({ label, children, rightElement }: { label: string; children: React.ReactNode; rightElement?: React.ReactNode }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className={MODAL_STYLES.label}>{label}</label>
      {rightElement}
    </div>
    {children}
  </div>
);

const RecordingButton = ({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      isRecording 
        ? 'bg-red-500/20 text-red-400 animate-pulse' 
        : 'bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/30'
    }`}
  >
    {isRecording ? <StopCircle size={14} /> : <Mic size={14} />}
    {isRecording ? 'Stop Recording' : 'Start Recording'}
  </button>
);

export function CreateCaseModal({ isOpen, onClose }: CreateCaseModalProps) {
  const { handleCreateCase } = useConversations();
  const [caseName, setCaseName] = useState('');
  const [partyInvolved, setPartyInvolved] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setNotes(prev => prev + (prev ? ' ' : '') + finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access is denied. Please allow microphone access in your browser settings to use speech-to-text.');
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await handleCreateCase({ name: caseName, party: partyInvolved, notes });
      onClose();
      setCaseName('');
      setPartyInvolved('');
      setNotes('');
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case. Please try again.');
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
              <div className={MODAL_STYLES.content}>
                <ModalHeader title="Create New Case" onClose={onClose} />

                <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
                  Fill in the case details below. Use the microphone to record or transcribe conversations.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label="Case Name">
                    <input
                      required
                      type="text"
                      value={caseName}
                      onChange={e => setCaseName(e.target.value)}
                      placeholder="e.g., Smith vs. Jones Property Dispute"
                      className={MODAL_STYLES.input}
                    />
                  </FormField>

                  <FormField label="Party Involved">
                    <input
                      type="text"
                      value={partyInvolved}
                      onChange={e => setPartyInvolved(e.target.value)}
                      placeholder="e.g., John Smith, Jane Doe"
                      className={MODAL_STYLES.input}
                    />
                  </FormField>

                  <FormField 
                    label="Transcript / Notes" 
                    rightElement={<RecordingButton isRecording={isRecording} onClick={toggleRecording} />}
                  >
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Type notes or use the microphone button to record a conversation..."
                      rows={5}
                      className={MODAL_STYLES.textarea}
                    />
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className={MODAL_STYLES.buttonCancel}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !caseName.trim()}
                      className={MODAL_STYLES.buttonSubmit}
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Create Case'}
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
