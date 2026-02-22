'use client';

import React from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { STRINGS } from './constants';

interface ButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export const TranscriptionButton = ({ isRecording, onClick }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      isRecording 
        ? 'bg-red-500/20 text-red-400 animate-pulse' 
        : 'bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/30'
    }`}
  >
    {isRecording ? <StopCircle size={14} /> : <Mic size={14} />}
    {isRecording ? STRINGS.transcriptionActive : STRINGS.transcriptionInactive}
  </button>
);

export const AudioRecordButton = ({ isRecording, onClick }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      isRecording 
        ? 'bg-red-500/20 text-red-400 animate-pulse' 
        : 'bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/30'
    }`}
  >
    {isRecording ? <StopCircle size={14} /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
    {isRecording ? STRINGS.voiceActive : STRINGS.voiceInactive}
  </button>
);
