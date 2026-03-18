'use client';

import React from 'react';
import { MODAL_STYLES, STRINGS } from './constants';

interface CaseNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const CaseNameInput = React.memo(({ value, onChange }: CaseNameInputProps) => {
  return (
    <input
      required
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={STRINGS.caseNamePlaceholder}
      className={MODAL_STYLES.input}
    />
  );
});

CaseNameInput.displayName = 'CaseNameInput';
