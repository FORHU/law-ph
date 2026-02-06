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
    <div className="mb-8">
      <div className={`flex items-center gap-2 mb-4 text-sm text-[${COLORS.PRIMARY}]`}>
        <Scale size={16} />
        <span>Quick questions to get started</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="px-5 py-3 bg-[#2A2A2A]/50 backdrop-blur border border-[#8B4564]/30 rounded-lg hover:bg-[#2A2A2A]/70 hover:border-[#8B4564]/50 transition-all text-left text-sm text-gray-300"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
