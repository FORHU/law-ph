'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface QuickQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function QuickQuestions({ questions, onSelect }: QuickQuestionsProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-[#722f37]">
        <Scale size={14} />
        <span>Quick Consultation Starters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="px-6 py-4 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-[#722f37]/30 transition-all text-left text-sm text-gray-300 font-medium group"
          >
            <span className="group-hover:text-white transition-colors">{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
