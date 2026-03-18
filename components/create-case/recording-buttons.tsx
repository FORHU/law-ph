import React from 'react';
import { Mic, StopCircle } from 'lucide-react';
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
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.5, 0, 0.5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="absolute w-4 h-4 rounded-full bg-red-500/40"
    />
    <div className="relative w-2 h-2 rounded-full bg-red-500" />
  </div>
);

export const TranscriptionButton = ({ isRecording, onClick, duration = 0 }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      isRecording 
        ? 'bg-red-500/20 text-red-400' 
        : 'bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/30'
    }`}
  >
    {isRecording ? <RecordingPulse /> : <Mic size={14} />}
    <span>{isRecording ? STRINGS.transcriptionActive : STRINGS.transcriptionInactive}</span>
    {isRecording && <span className="ml-1 border-l border-red-500/30 pl-2 font-mono">{formatDuration(duration)}</span>}
  </button>
);

export const AudioRecordButton = ({ isRecording, onClick, duration = 0 }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      isRecording 
        ? 'bg-red-500/20 text-red-400' 
        : 'bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/30'
    }`}
  >
    {isRecording ? <RecordingPulse /> : <Mic size={14} />}
    <span>{isRecording ? STRINGS.voiceActive : STRINGS.voiceInactive}</span>
    {isRecording && <span className="ml-1 border-l border-red-500/30 pl-2 font-mono">{formatDuration(duration)}</span>}
  </button>
);
