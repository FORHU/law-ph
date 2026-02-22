import React, { useState } from 'react';
import { Edit2, Undo2 } from 'lucide-react';
import { MapNode, MindMapProps } from './types';
import { MIND_MAP_COLORS } from './constants';
import { MindMapNode } from './mind-map-node';

export function MindMap({ rootTitle = "Case Analysis" }: MindMapProps) {
  const [data, setData] = useState<MapNode>({
    id: 'root',
    text: rootTitle,
    color: 'bg-[#8B4564]/30 border-[#8B4564] text-white font-bold shadow-[0_0_15px_rgba(139,69,100,0.4)]',
    children: [
      { id: 'c1', text: 'Legal Strategy', color: MIND_MAP_COLORS[0], children: [] },
      { id: 'c2', text: 'Key Evidence', color: MIND_MAP_COLORS[1], children: [] },
      { id: 'c3', text: 'Parties Involved', color: MIND_MAP_COLORS[2], children: [] }
    ]
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<MapNode[]>([]);

  const updateDataWithHistory = (newData: MapNode) => {
    setHistory(prev => [...prev.slice(-15), data]);
    setData(newData);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setData(previousState);
  };

  const updateNode = (nodes: MapNode[], id: string, newText: string): MapNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, text: newText };
      if (node.children) return { ...node, children: updateNode(node.children, id, newText) };
      return node;
    });
  };

  const addNode = (nodes: MapNode[], parentId: string): MapNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        const color = MIND_MAP_COLORS[node.children.length % MIND_MAP_COLORS.length];
        return {
          ...node,
          children: [...node.children, { id: Date.now().toString(), text: 'New Node', color, children: [] }]
        };
      }
      if (node.children) {
        return { ...node, children: addNode(node.children, parentId) };
      }
      return node;
    });
  };

  const deleteNode = (nodes: MapNode[], id: string): MapNode[] => {
    return nodes.filter(node => node.id !== id).map(node => {
      if (node.children) return { ...node, children: deleteNode(node.children, id) };
      return node;
    });
  };

  const handleEdit = (id: string, currentText: string) => {
    setEditingId(id);
  };

  const handleSave = (id: string, newText: string) => {
    if (id === 'root') {
      updateDataWithHistory({ ...data, text: newText });
    } else {
      updateDataWithHistory({ ...data, children: updateNode(data.children, id, newText) });
    }
    setEditingId(null);
  };

  const handleAdd = (id: string) => {
    if (id === 'root') {
      const color = MIND_MAP_COLORS[data.children.length % MIND_MAP_COLORS.length];
      updateDataWithHistory({
        ...data,
        children: [...data.children, { id: Date.now().toString(), text: 'New Branch', color, children: [] }]
      });
    } else {
      updateDataWithHistory({ ...data, children: addNode(data.children, id) });
    }
  };

  const handleDelete = (id: string) => {
    if (id === 'root') return; // Cannot delete root
    updateDataWithHistory({ ...data, children: deleteNode(data.children, id) });
  };

  return (
    <div className="w-full h-[600px] bg-[#111111] rounded-2xl border border-white/10 overflow-auto p-8 shadow-inner relative flex items-start mind-map-container">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      <div className="min-w-max relative z-10 p-12 drop-shadow-2xl">
        <MindMapNode 
          node={data} 
          isRoot={true}
          onEdit={handleEdit}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onSave={handleSave}
          editingId={editingId}
        />
      </div>
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={undo}
          disabled={history.length === 0}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg backdrop-blur-md border shadow-lg transition-all \${
            history.length > 0 
              ? 'bg-[#8B4564]/30 border-[#8B4564]/50 text-white hover:bg-[#8B4564]/50' 
              : 'bg-black/20 border-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Undo2 size={14} />
          <span className="text-sm font-medium">Undo</span>
        </button>
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur break-words max-w-[90%] flex items-center gap-2 z-20 pointer-events-none">
        <Edit2 size={12} className="shrink-0" /> Double-click to edit. Hover node to add/delete branch. Drag branches freely.
      </div>
    </div>
  );
}
