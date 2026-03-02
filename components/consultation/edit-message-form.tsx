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
         className="w-full bg-black/40 border border-[#8B4564]/50 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#8B4564] min-h-[150px] resize-y custom-sidebar-scrollbar whitespace-pre-wrap"
         value={text}
         onChange={(e) => setText(e.target.value)}
         placeholder="Edit your message..."
         autoFocus
      />
      <div className="flex justify-end gap-2 mt-1">
        <button 
           type="button"
           onClick={onCancel}
           className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
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
           className="px-4 py-1.5 text-xs font-semibold bg-[#8B4564] text-white rounded-md hover:bg-[#A35276] transition-colors shadow-lg shadow-[#8B4564]/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
