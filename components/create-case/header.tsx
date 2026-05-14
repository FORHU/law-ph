'use client';

import React from 'react';
import { X, Briefcase } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export const ModalHeader = ({ title, onClose }: ModalHeaderProps) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-[#722f37]/20 rounded-xl text-[#e9c176] border border-[#722f37]/30">
        <Briefcase size={18} />
      </div>
      <h2 className="text-xl font-serif text-white tracking-tight">{title}</h2>
    </div>
    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
      <X size={20} />
    </button>
  </div>
);
