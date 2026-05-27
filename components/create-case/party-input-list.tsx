'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { MODAL_STYLES, STRINGS } from './constants';

interface Party {
  id: string;
  value: string;
}

interface PartyInputListProps {
  parties: Party[];
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

export const PartyInputList = React.memo(({
  parties,
  onUpdate,
  onRemove,
  onKeyDown,
  inputRefs
}: PartyInputListProps) => {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {parties.map((party, index) => (
          <motion.div
            key={party.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex gap-2 group"
          >
            <input
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              value={party.value}
              onChange={e => onUpdate(party.id, e.target.value)}
              onKeyDown={e => onKeyDown(e, index)}
              placeholder={STRINGS.partyPlaceholder}
              className={MODAL_STYLES.input}
            />
            {parties.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(party.id)}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 self-center"
              >
                <Trash2 size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <p className="text-[10px] text-gray-500 ml-1">{STRINGS.partyHint}</p>
    </div>
  );
});

PartyInputList.displayName = 'PartyInputList';
