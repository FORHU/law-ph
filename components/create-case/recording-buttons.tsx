import React from 'react';
import { Mic, Captions } from 'lucide-react';
import { motion } from 'framer-motion';
import { STRINGS } from './constants';

interface ButtonProps {
  isRecording: boolean;
  onClick: () => void;
  duration?: number;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingPulse = () => (
  <div className="relative flex items-center justify-center">
    <motion.div
      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute w-4 h-4 rounded-full bg-red-500/40"
    />
    <div className="relative w-2 h-2 rounded-full bg-red-500" />
  </div>
);

export const TranscriptionButton = ({ isRecording, onClick, duration = 0 }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={isRecording ? STRINGS.transcriptionActive : STRINGS.transcriptionInactive}
    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
      isRecording
        ? 'bg-red-500/20 text-red-400'
        : 'bg-[#722f37]/20 text-[#e9c176]/80 hover:bg-[#722f37]/40 hover:text-[#e9c176]'
    }`}
  >
    {isRecording ? <RecordingPulse /> : <Captions size={14} />}
    {/* Label hidden on very small screens */}
    <span className="hidden xs:inline sm:inline">
      {isRecording ? STRINGS.transcriptionActive : STRINGS.transcriptionInactive}
    </span>
    {isRecording && (
      <span className="border-l border-red-500/30 pl-1.5 font-mono">{formatDuration(duration)}</span>
    )}
  </button>
);

export const AudioRecordButton = ({ isRecording, onClick, duration = 0 }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={isRecording ? STRINGS.voiceActive : STRINGS.voiceInactive}
    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
      isRecording
        ? 'bg-red-500/20 text-red-400'
        : 'bg-[#722f37]/20 text-[#e9c176]/80 hover:bg-[#722f37]/40 hover:text-[#e9c176]'
    }`}
  >
    {isRecording ? <RecordingPulse /> : <Mic size={14} />}
    {/* Label hidden on very small screens */}
    <span className="hidden xs:inline sm:inline">
      {isRecording ? STRINGS.voiceActive : STRINGS.voiceInactive}
    </span>
    {isRecording && (
      <span className="border-l border-red-500/30 pl-1.5 font-mono">{formatDuration(duration)}</span>
    )}
  </button>
);
