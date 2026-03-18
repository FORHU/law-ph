'use client';

import React from 'react';
import { TranscriptionButton, AudioRecordButton } from './recording-buttons';

interface RecordingControlsProps {
  isRecording: boolean;
  isAudioRecording: boolean;
  duration: number;
  onToggleTranscription: () => void;
  onToggleAudio: () => void;
}

export const RecordingControls = React.memo(({
  isRecording,
  isAudioRecording,
  duration,
  onToggleTranscription,
  onToggleAudio
}: RecordingControlsProps) => {
  return (
    <div className="flex gap-2">
      <AudioRecordButton 
        isRecording={isAudioRecording} 
        onClick={onToggleAudio} 
        duration={duration}
      />
      <TranscriptionButton 
        isRecording={isRecording} 
        onClick={onToggleTranscription} 
        duration={duration}
      />
    </div>
  );
});

RecordingControls.displayName = 'RecordingControls';
