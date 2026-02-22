'use client';

import React from 'react';
import { Sparkles, History } from 'lucide-react';
import { STRINGS } from './constants';

interface AISummarizerProps {
  onSummarize: () => void;
  onRestoreOriginal: () => void;
  isSummarizing: boolean;
  hasNotes: boolean;
  hasOriginalNotes: boolean;
  isShowingSummary: boolean;
}

export const AISummarizerControls = ({
  onSummarize,
  onRestoreOriginal,
  isSummarizing,
  hasNotes,
  hasOriginalNotes,
  isShowingSummary
}: AISummarizerProps) => {
  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSummarize}
          disabled={!hasNotes || isSummarizing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#8B4564]/10 text-[#E0A7C2] hover:bg-[#8B4564]/20 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
        >
          <Sparkles size={13} />
          {STRINGS.summarizeBtn}
        </button>
        
        {hasOriginalNotes && (
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 text-gray-400 hover:bg-white/10 rounded-lg text-[11px] font-medium transition-all"
          >
            <History size={13} />
            {isShowingSummary ? STRINGS.originalBtn : STRINGS.summaryBtn}
          </button>
        )}
      </div>
    </div>
  );
};
