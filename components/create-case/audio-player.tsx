'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Trash2, Volume2 } from 'lucide-react';
import { STRINGS } from './constants';

interface AudioPlayerProps {
  url: string;
  onDiscard: () => void;
}

export const SimpleAudioPlayer = ({ url, onDiscard }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-black/20 border border-[#8B4564]/20 rounded-xl mt-3 animate-in fade-in slide-in-from-top-2">
      <div className="p-2 bg-[#8B4564]/20 rounded-full text-[#E0A7C2]">
        <Volume2 size={16} />
      </div>
      
      <div className="flex-1">
        <p className="text-[11px] font-medium text-gray-300">{STRINGS.recordingLabel}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{STRINGS.recordingStatus}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="p-2 bg-[#8B4564]/20 text-[#E0A7C2] hover:bg-[#8B4564]/40 rounded-lg transition-all"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        
        <button
          type="button"
          onClick={onDiscard}
          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
          title="Discard Recording"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <audio 
        ref={audioRef} 
        src={url} 
        onEnded={() => setIsPlaying(false)} 
        className="hidden" 
      />
    </div>
  );
};
