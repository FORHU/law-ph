'use client';

import React from 'react';
import { MODAL_STYLES } from './constants';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormField = ({ label, children, rightElement }: FormFieldProps) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className={MODAL_STYLES.label}>{label}</label>
      {rightElement}
    </div>
    {children}
  </div>
);
