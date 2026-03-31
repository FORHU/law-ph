import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ReactDOM from 'react-dom';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Layout, Maximize, Palette, Check, Save, RotateCcw, Trash2, Plus, Minus, Target, Lock, Unlock, ChevronUp, X, FileText, Box, Monitor } from 'lucide-react';
import { MindMapProps } from './types';
import { MIND_MAP_COLORS, MIND_MAP_THEMES, MindMapThemeType } from './constants';
import ReactMarkdown from 'react-markdown';
import { CustomNode } from './custom-node';
const MindMap3D = dynamic(() => import('./mind-map-3d').then(m => m.MindMap3D), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#050505]/40 animate-pulse flex items-center justify-center text-white/20 text-xs font-black uppercase tracking-widest">Initialising 3D Reality...</div>
});
import type { MindMap3DHandle } from './mind-map-3d';

const nodeTypes = {
  custom: CustomNode,
};

const getInitialNodes = (theme: MindMapThemeType): Node[] => [
  {
    id: 'root',
    type: 'custom',
    data: {
      label: 'Case Analysis',
      isRoot: true,
      theme,
      color: MIND_MAP_THEMES[theme].rootClass
    },
    position: { x: 0, y: 0 },
  },
];

function MindMapInner({ rootTitle = "Case Analysis", data, initialTheme = 'premium' }: MindMapProps) {
  const [theme, setTheme] = useState<MindMapThemeType>(initialTheme);
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'compact' | 'radial' | 'dual'>('horizontal');
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes(theme));
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
  const [is3D, setIs3D] = useState(true);
  const mindMap3DRef = useRef<MindMap3DHandle>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Holds enriched data from 3D click (description, media) since 3D is outside React Flow
  const [selected3DNodeData, setSelected3DNodeData] = useState<any>(null);

  const { fitView, zoomIn, zoomOut, getNodes } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [slots, setSlots] = useState<({ nodes: Node[], edges: Edge[] } | null)[]>(Array(3).fill(null));



  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err: any) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const themeConfig = MIND_MAP_THEMES[theme];

  const getChildren = (item: any) => {
    return item.children || item.items || item.subnodes || item.branches || item.subitems || [];
  };

  const treeToGraph = useCallback((root: any, currentTheme: MindMapThemeType, currentLayout: 'horizontal' | 'vertical' | 'compact' | 'radial' | 'dual') => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let colorIndex = 0;
    const config = MIND_MAP_THEMES[currentTheme];

    const subtreeSizes = new Map<any, number>();
    const calcSize = (item: any): number => {
      const children = getChildren(item);
      if (children.length === 0) {
        return currentLayout === 'vertical' ? 450 : 280;
      }
      let total = 0;
      children.forEach((child: any) => {
        total += calcSize(child);
      });
      const sizeWithPadding = Math.max(total + (children.length - 1) * 40, currentLayout === 'vertical' ? 450 : 280);
      subtreeSizes.set(item, sizeWithPadding);
      return sizeWithPadding;
    };

    calcSize(root);

    const traverse = (item: any, parentId: string | null = null, x = 0, y = 0, angleRange: [number, number] = [0, 360], depth = 0, side: 'left' | 'right' | 'top' | 'bottom' = 'right') => {
      const id = item.id || `node-${Math.random().toString(36).substr(2, 9)}`;
      const isRoot = id === 'root' || !parentId;
      const color = isRoot ? config.rootClass : config.nodeClass(colorIndex++);

      let label = item.label || item.text || 'Untitled';
      let description = item.description || item.details || item.summary || '';

      if (isRoot && (label === 'Case Analysis' || label === 'Legal Strategy Map')) {
        label = rootTitle;
      }

      nodes.push({
        id,
        type: 'custom',
        data: {
          label,
          description,
          media: item.media, // Pass media data forward for 2D/3D
          isRoot,
          color,
          theme: currentTheme,
          layout: currentLayout,
          side // Pass the calculated side to the node
        },
        position: { x, y },
      });

      if (parentId) {
        // Root node in Dual/Radial has multiple source handles (left, right, top, bottom)
        const isFromRoot = parentId === 'root' && (currentLayout === 'dual' || currentLayout === 'radial');
        const sourceHandleId = isFromRoot ? side : undefined;

        edges.push({
          id: `e${parentId}-${id}`,
          source: parentId,
          target: id,
          sourceHandle: sourceHandleId,
          animated: true,
          style: { stroke: config.edgeColor, strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: config.edgeColor }
        });
      }

      const children = getChildren(item);
      if (children.length > 0) {
        if (currentLayout === 'radial') {
          // Calculate a dynamic global radius from the center (0,0) instead of the parent
          // This creates beautiful concentric circles and prevents messy overlapping
          let depthRadius = 500;
          if (depth === 0) depthRadius = 500;
          else if (depth === 1) depthRadius = 1100;
          else depthRadius = 1100 + (depth - 1) * 500;

          const [startAngle, endAngle] = angleRange;
          const totalAngle = endAngle - startAngle;
          const anglePerChild = totalAngle / children.length;

          children.forEach((child: any, index: number) => {
            const currentAngle = startAngle + (anglePerChild * index) + (anglePerChild / 2);
            const normalizedAngle = ((currentAngle % 360) + 360) % 360;

            const rad = (currentAngle * Math.PI) / 180;
            // Position relative to Root (0,0) not the parent's x,y
            const cx = depthRadius * Math.cos(rad);
            const cy = depthRadius * Math.sin(rad);

            const childStart = startAngle + (anglePerChild * index);
            const childEnd = childStart + anglePerChild;

            // Map angle to the best handle on the parent/root
            let childSide: 'left' | 'right' | 'top' | 'bottom' = 'right';
            if (normalizedAngle >= 45 && normalizedAngle < 135) childSide = 'bottom';
            else if (normalizedAngle >= 135 && normalizedAngle < 225) childSide = 'left';
            else if (normalizedAngle >= 225 && normalizedAngle < 315) childSide = 'top';

            traverse(child, id, cx, cy, [childStart, childEnd], depth + 1, childSide);
          });
        } else if (currentLayout === 'dual' && isRoot) {
          const midway = Math.ceil(children.length / 2);
          const leftChildren = children.slice(0, midway);
          const rightChildren = children.slice(midway);

          const leftSize = leftChildren.reduce((acc: number, c: any) => acc + (subtreeSizes.get(c) || 200), 0) + (leftChildren.length - 1) * 80;
          const rightSize = rightChildren.reduce((acc: number, acc_val: any) => acc + (subtreeSizes.get(acc_val) || 200), 0) + (rightChildren.length - 1) * 80;

          let leftOffset = -(leftSize / 2);
          leftChildren.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || 280;
            traverse(child, id, x - 550, y + (leftOffset + childSize / 2), [0, 0], 1, 'left');
            leftOffset += childSize + 40;
          });

          let rightOffset = -(rightSize / 2);
          rightChildren.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || 280;
            traverse(child, id, x + 550, y + (rightOffset + childSize / 2), [0, 0], 1, 'right');
            rightOffset += childSize + 40;
          });
        } else {
          const itemSize = subtreeSizes.get(item) || (currentLayout === 'vertical' ? 450 : 280);
          let offset = -(itemSize / 2);

          children.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || (currentLayout === 'vertical' ? 450 : 280);
            const posOffset = offset + (childSize / 2);

            if (currentLayout === 'vertical') {
              traverse(child, id, x + posOffset, y + 350);
            } else if (currentLayout === 'dual') {
              traverse(child, id, x + (side === 'left' ? -550 : 550), y + posOffset, [0, 0], depth + 1, side);
            } else if (currentLayout === 'compact') {
              traverse(child, id, x + 450, y + posOffset);
            } else {
              traverse(child, id, x + 550, y + posOffset);
            }

            offset += childSize + 40;
          });
        }
      }
    };

    traverse(root, null, 0, 0);
    return { nodes, edges };
  }, [rootTitle]);

  useEffect(() => {
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      const { nodes: newNodes, edges: newEdges } = treeToGraph(data, theme, layout);
      setNodes(newNodes);
      setEdges(newEdges);

      // Persist the state to survive refreshes
      try {
        localStorage.setItem('law_ph_last_mind_map', JSON.stringify({ nodes: newNodes, edges: newEdges, data }));
      } catch (e) {
        console.error('Failed to persist map data:', e);
      }
    } else {
      // Re-access data from persistence if prop is missing on refresh
      try {
        const cached = localStorage.getItem('law_ph_last_mind_map');
        if (cached) {
          const { nodes: oldNodes, edges: oldEdges } = JSON.parse(cached);
          if (oldNodes?.length > 0) {
            setNodes(oldNodes);
            setEdges(oldEdges);
          }
        }
      } catch (e) {
        console.error('Failed to recover map data:', e);
      }
    }
  }, [data, theme, layout, treeToGraph, setNodes, setEdges]);

  const handleLayoutChange = (newLayout: 'horizontal' | 'vertical' | 'compact' | 'radial' | 'dual') => {
    setLayout(newLayout);
    setIsThemeOpen(false);
  };

  const resetLayout = useCallback(() => {
    setSelectedNodeId(null);
    if (is3D) {
      mindMap3DRef.current?.recenter();
      return;
    }
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      const { nodes: newNodes, edges: newEdges } = treeToGraph(data, theme, layout);
      setNodes(newNodes);
      setEdges(newEdges);
      setTimeout(() => fitView({ padding: 0.05, duration: 800 }), 100);
    }
  }, [data, theme, layout, treeToGraph, setNodes, setEdges, fitView, is3D]);

  const saveToSlot = (idx: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[idx] = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      };
      return next;
    });
  };

  const loadFromSlot = (idx: number) => {
    const slot = slots[idx];
    if (slot) {
      setNodes(slot.nodes);
      setEdges(slot.edges);
      setTimeout(() => fitView({ padding: 0.05, duration: 800 }), 100);
    }
  };

  const deleteSlot = (idx: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };



  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-15), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
  }, [nodes, edges]);

  const onConnect = useCallback((params: Connection | Edge) => {
    saveToHistory();
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: themeConfig.edgeColor, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: themeConfig.edgeColor }
    }, eds));
  }, [setEdges, saveToHistory, themeConfig]);

  const handleEditNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newLabel = prompt('Enter new text:', node.data.label);
    if (newLabel !== null) {
      saveToHistory();
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n));
    }
  }, [nodes, setNodes, saveToHistory]);

  const handleAddNode = useCallback((parentId: string) => {
    saveToHistory();
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    const id = Date.now().toString();
    const childIndex = edges.filter(e => e.source === parentId).length;
    const color = themeConfig.nodeClass(childIndex);
    const newNode: Node = {
      id,
      type: 'custom',
      data: { id, label: 'New Node', color, theme, onEdit: handleEditNode, onAdd: handleAddNode, onDelete: handleDeleteNode },
      position: { x: parentNode.position.x + 350, y: parentNode.position.y + (childIndex - 1) * 120 },
    };
    const newEdge: Edge = {
      id: `e${parentId}-${id}`, source: parentId, target: id, animated: true,
      style: { stroke: themeConfig.edgeColor, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: themeConfig.edgeColor }
    };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
  }, [nodes, edges, setNodes, setEdges, handleEditNode, themeConfig, theme, saveToHistory]);

  const handleDeleteNode = useCallback((id: string) => {
    if (id === 'root') return;
    saveToHistory();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, [setNodes, setEdges, saveToHistory]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: { ...node.data, id: node.id, onEdit: handleEditNode, onAdd: handleAddNode, onDelete: handleDeleteNode, isSelected: node.id === selectedNodeId }
    }));
  }, [nodes, handleEditNode, handleAddNode, handleDeleteNode, selectedNodeId]);

  // In 3D mode, use the data stored from the 3D click; in 2D use React Flow
  const selectedNodeData = useMemo(() => {
    if (is3D && selected3DNodeData) return selected3DNodeData;
    return getNodes().find(n => n.id === selectedNodeId)?.data;
  }, [selectedNodeId, getNodes, is3D, selected3DNodeData]);

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setNodes(previousState.nodes);
    setEdges(previousState.edges);
  };
  const isAttachment = selectedNodeId && selectedNodeData?.id ? selectedNodeData.id.startsWith('attachment-') : false;

  return (
    <div
      ref={containerRef}
      className={`w-full h-[calc(92vh-150px)] min-h-[700px] max-h-[1200px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative transition-colors duration-500 scrollbar-hide flex flex-col ${isFullScreen ? 'h-screen max-h-none border-none rounded-none' : ''}`}
      style={{ backgroundColor: themeConfig.bg }}
    >
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none !important; }
        .scrollbar-hide { -ms-overflow-style: none !important; scrollbar-width: none !important; overflow: hidden !important; }
        .react-flow__viewport { transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
        .react-flow__node { transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease !important; }
      `}</style>

      <div className="flex-1 relative overflow-hidden">
        {/* 3D Model Layer */}
        {is3D && data && (
          <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden z-10">
            <MindMap3D
              ref={mindMap3DRef}
              root={data}
              rootTitle={rootTitle}
              themeColor={themeConfig.edgeColor}
              onNodeClick={(node) => {
                setSelectedNodeId(node.id);
                // Store full enriched data so detail panel works in 3D mode
                setSelected3DNodeData({
                  id: node.id,
                  label: node.label,
                  description: node.description,
                  media: node.media,
                  color: node.color || themeConfig.edgeColor
                });
              }}
              onBackgroundClick={() => {
                setSelectedNodeId(null);
                setSelected3DNodeData(null);
              }}
            />
          </div>
        )}

        <div className={`absolute inset-0 transition-opacity duration-700 ${is3D ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              fitView({ nodes: [node], duration: 800, padding: 0.6 });
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              fitView({ padding: 0.05, duration: 800 });
            }}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            minZoom={0.05}
            maxZoom={1}
            style={{ background: 'transparent' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={themeConfig.gridColor} gap={24} />
            {/* Custom controls are handled below in the Unified Control Center */}
          </ReactFlow>
        </div>
      </div>

      {/* Perspective Toggle - Top Left (2D/3D Switch) */}
      <div className="absolute top-4 left-4 z-[100000] flex items-center gap-2">
        <button
          onClick={() => setIs3D(!is3D)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-all border border-white/10 ${is3D ? 'bg-white text-black font-black' : 'bg-[#1A1A1A]/80 text-[#E0A7C2] font-black border-[#E0A7C2]/30'
            }`}
        >
          {is3D ? <Monitor size={14} /> : <Box size={14} />}
          <span className="text-[9px] uppercase tracking-widest leading-none">{is3D ? '2D View' : '3D Model'}</span>
        </button>

        {/* MINIMIZED Structure Selector */}
        <div className="relative">
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-all border border-white/10 ${isThemeOpen ? 'bg-white text-black font-bold' : 'bg-[#E0A7C2] text-black font-bold shadow-[0_0_15px_rgba(224,167,194,0.3)] hover:scale-105 active:scale-95'
              }`}
          >
            <Layout size={12} />
            <span className="text-[9px] uppercase tracking-wider leading-none">Structure</span>
          </button>

          {isThemeOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#0A0A0A] border border-white/20 rounded-xl shadow-2xl z-[210] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
              <div className="p-2 border-b border-white/10 bg-white/5 text-center">
                <span className="text-[8px] uppercase tracking-widest font-black text-white/30">Layout Models</span>
              </div>
              <div className="p-1 grid grid-cols-1">
                {[
                  { id: 'horizontal', name: 'Strategic Flow', icon: '→' },
                  { id: 'vertical', name: 'Legal Hierarchy', icon: '↓' },
                  { id: 'dual', name: 'Dual Perspective', icon: '↔' },
                  { id: 'radial', name: 'Radial Brainstorm', icon: '○' },
                  { id: 'compact', name: 'Dense Analysis', icon: '▩' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLayoutChange(item.id as any)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between rounded-md hover:bg-white/5 transition-all text-[11px] font-bold ${layout === item.id ? 'text-[#E0A7C2] bg-white/5 border border-white/5' : 'text-gray-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-4 text-center opacity-50">{item.icon}</span>
                      {item.name}
                    </div>
                    {layout === item.id && <Check size={10} strokeWidth={4} />}
                  </button>
                ))}
                <div className="mt-1 pt-1 border-t border-white/5">
                  <div className="px-4 py-1.5 text-[8px] uppercase font-bold text-white/20">Themes</div>
                  {(Object.keys(MIND_MAP_THEMES) as MindMapThemeType[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTheme(key);
                        setIsThemeOpen(false);
                      }}
                      className={`w-full px-4 py-2 flex items-center gap-3 rounded-md hover:bg-white/5 transition-all text-[10px] font-bold ${theme === key ? 'text-[#E0A7C2]' : 'text-gray-500'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: MIND_MAP_THEMES[key].edgeColor }} />
                      {MIND_MAP_THEMES[key].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-[100000] pointer-events-auto">
        <button
          onClick={toggleFullScreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-all border border-white/10 bg-[#E0A7C2] text-black font-bold shadow-[0_0_15px_rgba(224,167,194,0.3)] hover:scale-105 active:scale-95"
        >
          <Maximize size={12} />
          <span className="text-[9px] uppercase tracking-wider">{isFullScreen ? 'Exit' : 'Full Screen'}</span>
        </button>
      </div>

      {/* Ultra-Compact Vertical Hub - Snug Corner */}
      <div className="absolute bottom-6 left-6 z-[100000] flex flex-col items-center gap-1 p-1 rounded-full bg-[#0A0A0A]/95 backdrop-blur-3xl border border-white/10 shadow-[5px_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/5 w-max pointer-events-auto transition-all hover:ring-white/20">

        {/* Navigation Group - Minimalist */}
        <div className="flex flex-col items-center gap-0.5 pb-1 border-b border-white/10">
          <button
            onClick={() => is3D ? mindMap3DRef.current?.zoomIn() : zoomIn()}
            className="p-1.5 text-white/30 hover:text-[#E0A7C2] hover:bg-white/5 rounded-full transition-all active:scale-95"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => is3D ? mindMap3DRef.current?.zoomOut() : zoomOut()}
            className="p-1.5 text-white/30 hover:text-[#E0A7C2] hover:bg-white/5 rounded-full transition-all active:scale-95"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => is3D ? mindMap3DRef.current?.recenter() : fitView({ padding: 0.05, duration: 800 })}
            className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
            title="Recenter"
          >
            <Target size={14} />
          </button>
        </div>

        {/* Memory Trigger - Ultra Tight */}
        <div className="relative group/mem">
          <button
            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
            className={`p-1.5 rounded-full transition-all active:scale-95 border ${isMemoryOpen
              ? 'bg-[#E0A7C2]/20 text-[#E0A7C2] border-[#E0A7C2]/30'
              : 'text-white/30 hover:bg-white/5 border-transparent'
              } flex items-center justify-center`}
            title="Snapshots"
          >
            <Save size={14} />
          </button>

          {/* Pop-out Dropdown - Snug position */}
          {isMemoryOpen && (
            <div className="absolute left-[calc(100%+8px)] bottom-0 w-max min-w-[240px] p-2.5 rounded-2xl bg-[#0F0F0F]/99 backdrop-blur-3xl border border-white/10 shadow-[30px_0_60px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-left-1">
              <div className="text-[8px] font-black text-[#E0A7C2] uppercase tracking-[0.2em] mb-3 pb-1.5 border-b border-white/5 px-1">Saved Structures</div>
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 group/item transition-all">
                    <div className="w-5 h-5 flex items-center justify-center rounded-md bg-white/5 text-[9px] font-black text-white/20 border border-white/5 group-hover/item:text-[#E0A7C2] transition-colors">
                      {idx + 1}
                    </div>

                    <div className="flex items-center gap-1.5 ml-4">
                      <button
                        onClick={() => { saveToSlot(idx); setIsMemoryOpen(false); }}
                        className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-[#E0A7C2] hover:bg-[#E0A7C2]/10 rounded-lg transition-all"
                      >
                        SAVE
                      </button>
                      {slots[idx] && (
                        <>
                          <div className="w-[1px] h-3 bg-white/10" />
                          <button
                            onClick={() => { loadFromSlot(idx); setIsMemoryOpen(false); }}
                            className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white hover:bg-white/10 rounded-lg transition-all"
                          >
                            LOAD
                          </button>
                          <button
                            onClick={() => deleteSlot(idx)}
                            className="p-1 px-1.5 text-white/10 hover:text-red-400 rounded-md transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-3 h-[1px] bg-white/10" />

        {/* Reset - Flush Bottom */}
        <button
          onClick={resetLayout}
          className="p-1.5 text-white/20 hover:text-red-500 transition-all group active:scale-95"
          title="Reset Map"
        >
          <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
        </button>
      </div>

      {containerRef.current && ReactDOM.createPortal(
        <AnimatePresence mode="wait">
          {selectedNodeId && selectedNodeData && (() => {
            const hasMediaOnly = (selectedNodeData.media?.length > 0) && (!selectedNodeData.description || selectedNodeData.description === 'N/A' || selectedNodeData.description.length < 5);

            return (
              <motion.div
                key={selectedNodeId}
                initial={{ opacity: 0, scale: 0.98, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute top-28 right-10 ${hasMediaOnly ? 'w-[260px]' : 'w-[310px]'} min-h-[500px] z-[99999] bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto overflow-hidden ring-1 ring-white/5 transition-all duration-500`}
              >
                {/* Elegant Header Accent */}
                <div
                  className="h-1 w-full opacity-60"
                  style={{ background: selectedNodeData.color?.replace('bg-', '') || '#E0A7C2' }}
                />

                <div className={`p-4 ${hasMediaOnly ? 'space-y-2' : 'p-7'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className={`font-bold text-white leading-tight pr-4 truncate ${hasMediaOnly ? 'text-base' : 'text-xl'}`}>
                      {selectedNodeData.label}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedNodeId(null);
                        if (is3D) {
                          mindMap3DRef.current?.recenter();
                        } else {
                          fitView({ padding: 0.05, duration: 800 });
                        }
                      }}
                      className="p-1 -mt-1 text-white/20 hover:text-white transition-colors shrink-0 bg-white/5 rounded-full hover:bg-white/10"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className={isAttachment ? "flex-1 min-h-0 flex flex-col" : "space-y-4"}>
                    {!isAttachment && (() => {
                      const desc = selectedNodeData.description || "N/A";
                      const isList = desc.includes('\n-') || desc.includes('\n*') || desc.startsWith('-') || desc.startsWith('*');
                      const isShort = desc.length < 50 && !desc.includes('.');

                      if (isList || isShort) {
                        const lines = desc.split('\n').map((l: string) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
                        return (
                          <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E0A7C2]">Key Information</span>
                            <ul className="space-y-2">
                              {lines.map((line: string, i: number) => (
                                <li key={i} className="text-[14px] text-white/70 flex items-start gap-2 leading-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E0A7C2]/40 mt-1 shrink-0" />
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <span className="inline-block">{children}</span>,
                                      strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>
                                    }}
                                  >
                                    {line}
                                  </ReactMarkdown>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }

                      return (
                        <div className="text-[14px] text-white/70 leading-relaxed font-medium">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>
                            }}
                          >
                            {desc}
                          </ReactMarkdown>
                        </div>
                      );
                    })()}

                    {/* LEGAL EVIDENCE GALLERY (Shared between 2D/3D) — Flex to fill the tall container */}
                    {selectedNodeData.media && selectedNodeData.media.length > 0 && (
                      <div className={isAttachment ? "flex-1 min-h-0 flex flex-col" : "mt-8 border-t border-white/5 pt-6 space-y-4 flex-1 flex flex-col min-h-0"}>
                        {!isAttachment && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E0A7C2]">Linked Evidence ({selectedNodeData.media.length})</span>}
                        <div className={isAttachment || hasMediaOnly ? "flex-1 min-h-0 flex flex-col gap-3" : "flex flex-col gap-3"}>
                          {selectedNodeData.media.map((item: any, idx: number) => {
                            if (item.type === 'image') return (
                              <div key={idx} className={`relative group/media overflow-hidden rounded-lg border border-white/10 shadow-md bg-black/20 ${hasMediaOnly ? 'flex-1' : 'aspect-video max-h-[120px]'}`}>
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className={`w-full transition-transform duration-500 group-hover/media:scale-105 ${hasMediaOnly ? 'h-full object-contain' : 'h-full object-cover'}`}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                  <span className="text-[9px] text-white/90 truncate block text-center font-bold">{item.name}</span>
                                </div>
                                <a href={item.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center bg-black/20">
                                  <span className="px-2 py-1 bg-white text-black text-[9px] font-black rounded-md shadow-lg scale-90 group-hover/media:scale-100 transition-transform uppercase">View</span>
                                </a>
                              </div>
                            );
                            if (item.type === 'audio') return (
                              <div key={idx} className="bg-[#050505]/60 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-3 shadow-inner">
                                <div className="w-8 h-8 rounded-full bg-[#E0A7C2]/20 flex items-center justify-center text-[#E0A7C2] text-xs">🎵</div>
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <span className="text-[10px] font-bold text-white/80 truncate mb-1">{item.name}</span>
                                  <audio controls className="w-full h-6 opacity-80 brightness-90 saturate-50 contrast-125 rounded-sm"><source src={item.url} /></audio>
                                </div>
                              </div>
                            );
                            if (item.type === 'file') {
                              const isWordDoc = /\.(doc|docx)$/i.test(item.name);
                              const isPDF = /\.pdf$/i.test(item.name);
                              
                              // STRATEGIC SAFETY: Never attempt to iframe a dead blob; it causes a "Black Hole"
                              const isDeadBlob = item.url?.startsWith('blob:');
                              const isMissingUrl = !item.url || item.url === '#' || isDeadBlob;
                              
                              const viewerUrl = isMissingUrl ? '' : (isWordDoc
                                ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.url)}`
                                : item.url);

                              if (isAttachment) {
                                return (
                                  <div key={idx} className="w-full flex-1 flex flex-col gap-4 min-h-0 pb-4">
                                    {isMissingUrl ? (
                                      <div className="flex-1 min-h-[400px] rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-center p-8">
                                        <div className="w-20 h-20 bg-[#E0A7C2]/10 rounded-full flex items-center justify-center mb-6 text-4xl">📄</div>
                                        <span className="text-white text-lg font-bold mb-2 uppercase tracking-widest">Hydrating Evidence...</span>
                                        <p className="text-white/40 text-sm max-w-[280px]">Browser security is blocking the temporary preview. Please wait for sync or click below to view.</p>
                                        <a href={item.url} target="_blank" rel="noreferrer" className="mt-6 px-6 py-3 bg-[#E0A7C2] text-black font-black rounded-xl hover:scale-105 transition-transform shadow-lg uppercase text-xs">Open Original Document</a>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex-1 min-h-[600px] relative rounded-2xl bg-white overflow-hidden shadow-2xl border-4 border-[#333]">
                                          <iframe
                                            src={viewerUrl}
                                            className="w-full h-full absolute inset-0"
                                            title={item.name}
                                          />
                                        </div>
                                        <div className="flex justify-between items-center px-2">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] text-[#E0A7C2] font-black uppercase tracking-widest">{item.name}</span>
                                            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em]">{isPDF ? 'Secured PDF Viewer' : 'Strategic Document Bridge'}</span>
                                          </div>
                                          <a href={item.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] text-white uppercase tracking-widest font-black rounded-lg transition-all border border-white/10">
                                            Open External ↗
                                          </a>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              }

                              // Standard View
                              return (
                                <details key={idx} className="group bg-[#0A0A0A] rounded-xl border border-white/10 overflow-hidden outline-none">
                                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-all list-none [&::-webkit-details-marker]:hidden">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-[#E0A7C2] text-black flex items-center justify-center rounded-xl font-bold shadow-lg">📄</div>
                                      <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-white/90 truncate max-w-[180px]">{item.name}</span>
                                        <span className="text-[9px] text-[#E0A7C2] font-black uppercase tracking-[0.2em]">View Brief</span>
                                      </div>
                                    </div>
                                    <div className="text-white/40 text-[10px] font-black uppercase group-open:rotate-180 transition-transform tracking-widest">Expand ↓</div>
                                  </summary>
                                  <div className="p-2 border-t border-white/5 bg-[#050505] flex flex-col gap-3">
                                    <iframe
                                      src={viewerUrl}
                                      className="w-full h-[400px] rounded-lg bg-white shadow-2xl"
                                      title={item.name}
                                    />
                                    <a href={item.url} target="_blank" rel="noreferrer" className="w-full py-3 bg-white/5 text-center text-[10px] text-white/60 font-black uppercase tracking-widest rounded-lg hover:bg-[#E0A7C2] hover:text-black transition-all">Open Full Document ↗</a>
                                  </div>
                                </details>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        containerRef.current
      )}

      {/* Snapshot Notification / Feedback logic could be added here if needed */}
    </div>
  );
}

export function MindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
