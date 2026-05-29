'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Send, AlertTriangle, Loader2, MessageSquare, History, GitGraph, Mail, Calendar, FileText, Sparkles, Mic, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadToS3Direct } from '@/lib/s3-utils';
import { startAWSBatchTranscription, getTranscriptionJobStatus, fetchTranscriptionText } from '@/lib/aws-transcribe-utils';
import { COLORS } from '@/lib/constants';
import { useAlert } from '@/components/alert-provider';

interface ChatInputProps {
  onSend: (message: string, file?: File | null, skipAIResponse?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  activeTab?: 'chat' | 'timeline' | 'mindmap' | 'email' | 'schedule' | 'document' | 'transcribe';
  onTabChange?: (tab: 'chat' | 'timeline' | 'mindmap' | 'email' | 'schedule' | 'document' | 'transcribe') => void;
  hasMessages?: boolean;
  isCaseMode?: boolean;
  onAnalyzeFile?: (file: File) => Promise<void>;
  onAnalyzeClick?: () => void;
  isAnalyzing?: boolean;
  onVoiceModeToggle?: () => void;
  isRecording?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
  status?: 'listening' | 'thinking' | 'idle';
  onStatusChange?: (status: 'listening' | 'thinking' | 'idle') => void;
}

export function ChatInput({
  onSend,
  placeholder = "Ask ilovelawyer regarding legal matters...",
  disabled = false,
  activeTab = 'chat',
  onTabChange,
  hasMessages = false,
  isCaseMode = false,
  onAnalyzeFile,
  onAnalyzeClick,
  isAnalyzing = false,
  onVoiceModeToggle,
  isRecording: externalIsRecording = false,
  onRecordingChange,
  status: externalStatus = 'idle',
  onStatusChange
}: ChatInputProps) {
  const { showAlert } = useAlert();
  const [value, setValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Voice States
  const [internalIsRecording, setInternalIsRecording] = useState(false);
  const [internalStatus, setInternalStatus] = useState<'listening' | 'thinking' | 'idle'>('idle');
  const [volume, setVolume] = useState(0);
  const [activeJobName, setActiveJobName] = useState<string | null>(null);

  const isRecording = onRecordingChange ? externalIsRecording : internalIsRecording;
  const status = onStatusChange ? externalStatus : internalStatus;

  const setIsRecording = (val: boolean) => {
    if (onRecordingChange) onRecordingChange(val);
    else setInternalIsRecording(val);
  };

  const setStatus = (val: 'listening' | 'thinking' | 'idle') => {
    if (onStatusChange) onStatusChange(val);
    else setInternalStatus(val);
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Background Polling Logic for Transcription
  useEffect(() => {
    if (activeJobName && status === 'thinking') {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const job = await getTranscriptionJobStatus(activeJobName);
          if (job?.TranscriptionJobStatus === 'COMPLETED') {
            clearInterval(pollingRef.current!);
            const text = await fetchTranscriptionText(job.Transcript!.TranscriptFileUri!);
            const cleanText = text.replace(/\[TS:.*?\]\s*\[.*?\]:\s*/g, '').trim();

            setActiveJobName(null);
            setStatus('idle');

            if (cleanText) {
              onSend(cleanText);
            }
          } else if (job?.TranscriptionJobStatus === 'FAILED') {
            clearInterval(pollingRef.current!);
            setActiveJobName(null);
            setStatus('idle');
          }
        } catch (err) {
          console.error("Transcription Polling error:", err);
        }
      }, 1500);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, activeJobName]);

  // Microphone Stream Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((value.trim() || selectedFile) && !disabled) {
      // For attach-only messages (no text), skip the standard AI response to trigger the receipt flow
      const skipAI = !!selectedFile && !value.trim();
      onSend(value, selectedFile, skipAI);
      setValue('');
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        showAlert("File is too large. Maximum size is 20MB.", "File Too Large");
        return;
      }
      setSelectedFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    isDragRef.current = false;
    setIsDragging(true);
    if (sliderRef.current) {
      setStartX(e.pageX - sliderRef.current.offsetLeft);
      setScrollLeft(sliderRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    if (sliderRef.current) {
      const x = e.pageX - sliderRef.current.offsetLeft;
      const walk = (x - startX) * 2; // scroll-fast
      if (Math.abs(walk) > 5) isDragRef.current = true;
      sliderRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 128;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const normalizedVolume = Math.min(100, Math.pow(average / 40, 0.7) * 100);
        setVolume(normalizedVolume);
        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('ogg') ? 'ogg' : 'webm');
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });

        setStatus('thinking');

        try {
          const s3Data = await uploadToS3Direct(file, file.name);
          if (!s3Data.file_url) throw new Error("Upload failed");

          const jobName = `voice-chat-${Date.now()}`;
          const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
          const s3Uri = `s3://${bucket}/${s3Data.s3_key}`;

          await startAWSBatchTranscription(s3Uri, jobName);
          setActiveJobName(jobName);
          // status is already 'thinking' from above
        } catch (error) {
          console.error("Integrated voice error:", error);
          setStatus('idle');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('listening');
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setVolume(0);
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <div className="relative z-10 bg-transparent flex-shrink-0">

      {/* Input Box */}
      <div className="px-4 md:px-6 py-3 md:py-4 landscape:py-1.5 md:pt-4 pt-2">
        <div className="max-w-4xl mx-auto">
          {hasMessages && (
            <div className="mb-3 landscape:mb-1.5 overflow-hidden">
              <div
                ref={sliderRef}
                className="flex gap-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <button
                  onClick={() => onTabChange?.('chat')}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'chat'
                    ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                >
                  <MessageSquare size={14} className={activeTab === 'chat' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                  Conversation
                </button>

                {isCaseMode && (
                  <>
                    <button
                      onClick={() => onTabChange?.('timeline')}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'timeline'
                        ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                        }`}
                    >
                      <History size={14} className={activeTab === 'timeline' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                      Timeline
                    </button>
                    <button
                      onClick={() => onTabChange?.('mindmap')}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'mindmap'
                        ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                        }`}
                    >
                      <GitGraph size={14} className={activeTab === 'mindmap' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                      Mind Map
                    </button>
                  </>
                )}

                <button
                  onClick={() => onTabChange?.('email')}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'email'
                    ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                >
                  <Mail size={14} className={activeTab === 'email' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                  Send Email
                </button>

                <button
                  onClick={() => onTabChange?.('schedule')}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'schedule'
                    ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                >
                  <Calendar size={14} className={activeTab === 'schedule' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                  Schedule
                </button>

                <button
                  onClick={() => onTabChange?.('transcribe')}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 ${activeTab === 'transcribe'
                    ? 'bg-[rgba(114,47,55,0.2)] text-[rgba(233,193,118,1)] border-[rgba(233,193,118,0.3)] shadow-[0_0_15px_rgba(114,47,55,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] text-gray-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                >
                  <Mic size={14} className={activeTab === 'transcribe' ? 'text-[rgba(233,193,118,1)]' : 'text-gray-500'} />
                  Transcribe
                </button>

              </div>
            </div>
          )}

          {/* Input Box - Hidden for forms that have their own inputs */}
          {activeTab !== 'mindmap' && activeTab !== 'timeline' && activeTab !== 'email' && activeTab !== 'schedule' && activeTab !== 'document' && (
            <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Compact Note above input */}
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] font-black text-[#722f37] opacity-60 px-4 mb-2 landscape:hidden">
                <AlertTriangle size={10} />
                <span>Image analysis is limited</span>
              </div>

              {/* Attached File Preview */}
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-3 ml-2 flex items-center gap-2 bg-[#0B0B0C]/80 border border-[#722f37]/30 rounded-xl pl-3 pr-2 py-2 shadow-lg z-20 backdrop-blur-xl"
                  >
                    <FileText size={16} className="text-[#e9c176]" />
                    <span className="text-xs text-white max-w-[200px] truncate">{selectedFile.name}</span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="ml-2 text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-full h-5 w-5 flex items-center justify-center transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center bg-[#0B0B0C]/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] focus-within:border-[#722f37]/50 transition-all overflow-hidden p-1.5 min-h-[56px] shadow-none">
                <AnimatePresence mode="wait">
                  {!isRecording && status === 'idle' ? (
                    <motion.textarea
                      key="input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      ref={textareaRef}
                      id="chat-message-input"
                      name="message"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      rows={1}
                      className="flex-1 pl-4 pr-2 py-3 bg-transparent text-sm md:text-base text-gray-200 placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-[160px] overflow-y-auto font-inter"
                      disabled={disabled}
                    />
                  ) : (
                    <motion.div
                      key="voice"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex items-center px-4 gap-4"
                    >
                      <div className="flex-1 flex items-center gap-1 h-6">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: status === 'listening' ? Math.max(2, (volume / 100) * 24 * (1 - Math.abs(i - 16) / 16)) : 2,
                              opacity: status === 'listening' ? 0.8 : 0.2
                            }}
                            className="w-1 bg-[#e9c176] rounded-full"
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black tracking-[0.2em] text-[#e9c176] animate-pulse whitespace-nowrap">
                        {status === 'listening' ? 'RECORDING...' : 'TRANSCRIBING...'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hidden File Input (attach) */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4"
                  className="hidden"

                  disabled={disabled}
                />

                {/* Paperclip / Attach button */}
                <button
                  type="button"
                  title="Attach Document or Media"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="h-11 w-11 md:h-10 md:w-10 rounded-lg transition-all flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-white hover:bg-[#722f37]/20"

                  disabled={disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:size-5 md:stroke-2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>

                </button>

                {/* Analyze Document button */}
                {onAnalyzeFile && (
                  <button
                    type="button"
                    title={isAnalyzing ? 'Analyzing document...' : 'Analyze Document with AI'}
                    onClick={() => {
                      if (!isAnalyzing) onAnalyzeClick?.();
                    }}
                    className={`h-11 w-11 md:h-10 md:w-10 rounded-lg transition-all flex items-center justify-center flex-shrink-0 mr-1 ${isAnalyzing
                      ? 'text-[#e9c176] bg-[#722f37]/20 cursor-not-allowed'
                      : 'text-gray-500 hover:text-[#e9c176] hover:bg-[#722f37]/20'
                      }`}
                    disabled={disabled || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 size={20} className="animate-spin md:size-4" />
                    ) : (
                      <Sparkles size={20} className="md:size-4 stroke-[2.5] md:stroke-2" />

                    )}

                  </button>
                )}

                {/* Voice Mode button */}
                <button
                  type="button"
                  title={isRecording ? "Stop Recording" : "Record Voice Message"}
                  onClick={handleVoiceToggle}
                  className={`h-11 w-11 md:h-10 md:w-10 rounded-lg transition-all flex items-center justify-center flex-shrink-0 mr-1 ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-gray-500 hover:text-[#e9c176] hover:bg-[#722f37]/20'}`}
                  disabled={disabled || status === 'thinking'}
                >
                  {isRecording ? (
                    <Square size={16} fill="currentColor" className="md:size-3.5" />
                  ) : status === 'thinking' ? (
                    <Loader2 size={20} className="animate-spin text-[#e9c176] md:size-4" />
                  ) : (
                    <Mic size={20} className="md:size-4 stroke-[2.5] md:stroke-2" />
                  )}
                </button>

                <button
                  className={`h-11 w-11 md:h-10 md:w-10 bg-gradient-to-r from-[#722f37] to-[#8b3a44] rounded-xl hover:from-[#8b3a44] hover:to-[#722f37] transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20`}
                  onClick={handleSend}
                  disabled={disabled || (!value.trim() && !selectedFile)}
                >
                  {disabled ? (
                    <Loader2 size={20} className="text-white animate-spin md:size-4" />
                  ) : (
                    <Send size={20} className="text-white md:size-4 stroke-[2.5] md:stroke-2" />
                  )}
                </button>

              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-0.5 text-center hidden md:block landscape:hidden">
            <p className="text-[10px] text-gray-500">
              AI can make mistakes. Verify important legal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
