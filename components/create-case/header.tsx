'use client';

import React from 'react';
import { X, Briefcase } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export const ModalHeader = ({ title, onClose }: ModalHeaderProps) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-[#8B4564]/20 rounded-lg text-[#E0A7C2]">
        <Briefcase size={18} />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
      <X size={20} />
    </button>
  </div>
);
