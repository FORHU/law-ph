'use client';

import React from 'react';
import { MODAL_STYLES, STRINGS } from './constants';

interface NotesTextareaProps {
  value: string;
  onChange: (value: string) => void;
}

export const NotesTextarea = React.memo(({ value, onChange }: NotesTextareaProps) => {
  return (
    <div className="relative group">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={STRINGS.notesPlaceholder}
        rows={5}
        className={MODAL_STYLES.textarea}
      />
    </div>
  );
});

NotesTextarea.displayName = 'NotesTextarea';

