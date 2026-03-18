'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { MODAL_STYLES, STRINGS } from './constants';

interface NotesTextareaProps {
  value: string;
  onChange: (value: string) => void;
  isSummarizing: boolean;
}

export const NotesTextarea = React.memo(({ value, onChange, isSummarizing }: NotesTextareaProps) => {
  return (
    <div className="relative group">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={STRINGS.notesPlaceholder}
        rows={5}
        className={MODAL_STYLES.textarea}
      />
      {isSummarizing && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center rounded-xl font-inter">
          <Loader2 size={24} className="text-[#8B4564] animate-spin" />
        </div>
      )}
    </div>
  );
});

NotesTextarea.displayName = 'NotesTextarea';
