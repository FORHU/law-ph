import React, { useState } from 'react';

export function EditMessageForm({ 
  initialText, 
  onSave,
  onCancel
}: { 
  initialText: string; 
  onSave: (newText: string) => void; 
  onCancel: () => void;
}) {
  // Replace zero-width spaces and non-breaking spaces that might cause rendering glitches
  // We keep \n and physical normal spaces intact.
  const [text, setText] = useState((initialText || "").replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' '));
  
  return (
    <div className="flex flex-col gap-2 relative z-10 w-full animate-in fade-in duration-200">
      <textarea
         id="edit-message-textarea"
         name="edit-message-content"
         className="w-full bg-black/40 border border-[#722f37]/50 rounded-xl p-4 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-[#722f37] min-h-[150px] resize-y custom-sidebar-scrollbar whitespace-pre-wrap leading-relaxed shadow-inner"
         value={text}
         onChange={(e) => setText(e.target.value)}
         placeholder="Edit your message..."
         autoFocus
      />
      <div className="flex justify-end gap-3 mt-4">
        <button 
           type="button"
           onClick={onCancel}
           className="px-5 py-2 text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
        <button 
           type="button"
           onClick={() => {
              if (typeof onSave === 'function') {
                onSave(text);
              }
           }}
           className="px-6 py-2 text-[10px] font-bold bg-[#722f37] text-white rounded-xl hover:bg-[#8b3a44] transition-all shadow-xl shadow-[#722f37]/20 uppercase tracking-widest"
        >
          Commit Changes
        </button>
      </div>
    </div>
  );
}
