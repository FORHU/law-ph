import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { MapNode } from './types';
import { MIND_MAP_COLORS } from './constants';

interface MindMapNodeProps {
  node: MapNode;
  isRoot?: boolean;
  onEdit: (id: string, currentText: string) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, newText: string) => void;
  editingId: string | null;
}

export function MindMapNode({
  node,
  isRoot = false,
  onEdit,
  onAdd,
  onDelete,
  onSave,
  editingId
}: MindMapNodeProps) {
  const isEditing = editingId === node.id;
  const [editText, setEditText] = useState(node.text);
  
  // Keep local input state synced when edit mode begins
  React.useEffect(() => {
    if (isEditing) setEditText(node.text);
  }, [isEditing, node.text]);

  const handleSave = () => {
    onSave(node.id, editText);
  };

  return (
    <motion.div 
      layout
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center w-max relative z-10"
      whileDrag={{ zIndex: 50 }}
    >
      {/* The Node Box */}
      <div 
        className={`relative group flex items-center gap-2 p-3 rounded-xl border-2 backdrop-blur-md min-w-[140px] max-w-[220px] transition-all hover:z-20 cursor-grab active:cursor-grabbing \${node.color || MIND_MAP_COLORS[0]}`}
      >
        {isEditing ? (
          <div className="flex items-center gap-1 w-full" onPointerDownCapture={(e) => e.stopPropagation()}>
            <input 
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-black/40 text-white px-2 py-1 rounded w-full outline-none text-sm focus:ring-1 focus:ring-white/50"
            />
            <button onClick={handleSave} className="p-1 hover:bg-white/20 rounded text-green-300">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center w-full gap-2">
            <span className="text-sm font-medium leading-tight break-words flex-1 cursor-text" onDoubleClick={() => onEdit(node.id, node.text)}>
              {node.text}
            </span>
            
            {/* Action Buttons (Visible on Hover) */}
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-black/60 p-1 rounded-lg absolute -top-8 right-0 shadow-lg" onPointerDownCapture={(e) => e.stopPropagation()}>
              <button onClick={() => onEdit(node.id, node.text)} className="p-1 hover:bg-white/20 rounded text-gray-300 transition-colors" title="Edit">
                <Edit2 size={12} />
              </button>
              <button onClick={() => onAdd(node.id)} className="p-1 hover:bg-white/20 rounded text-blue-300 transition-colors" title="Add Child">
                <Plus size={12} />
              </button>
              {!isRoot && (
                <button onClick={() => onDelete(node.id)} className="p-1 hover:bg-white/20 rounded text-red-400 transition-colors" title="Delete">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Connection line dot for children output */}
        {node.children.length > 0 && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1A1A1A] border-2 border-[inherit] z-10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[inherit]" />
          </div>
        )}
        
        {/* Connection line dot for parent input */}
        {!isRoot && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1A1A1A] border-2 border-[inherit] z-10 flex items-center justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-[inherit]" />
          </div>
        )}
      </div>

      {/* Children Render */}
      {node.children.length > 0 && (
        <div className="ml-12 flex flex-col gap-4 relative py-4">
          {/* SVG Connecting lines would go here, but using simple borders for now */}
          <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 w-[2rem] h-[calc(100%-3rem)] border-l-2 border-t-2 border-b-2 border-dashed border-gray-600 rounded-l-xl opacity-30 z-0 pointer-events-none" />
          
          <AnimatePresence>
            {node.children.map((child) => (
              <div key={child.id} className="relative z-10">
                {/* Horizontal line to child */}
                <div className="absolute w-[2rem] border-t-2 border-dashed border-gray-600 left-[-2rem] top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                <MindMapNode 
                  node={child}
                  onEdit={onEdit}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  onSave={onSave}
                  editingId={editingId}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
