import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, Volume2 } from 'lucide-react';
import { STRINGS } from './constants';

interface AudioPlayerProps {
  url: string;
  onDiscard: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SimpleAudioPlayer = ({ url, onDiscard }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-black/20 border border-[#8B4564]/20 rounded-xl mt-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#8B4564]/20 rounded-full text-[#E0A7C2]">
          <Volume2 size={16} />
        </div>
        
        <div className="flex-1">
          <p className="text-[11px] font-medium text-gray-300">{STRINGS.recordingLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden relative">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute top-0 left-0 h-full bg-[#8B4564] transition-all duration-100" 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(duration)}</span>
          </div>
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
      </div>

      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)} 
        className="hidden" 
      />
    </div>
  );
};
