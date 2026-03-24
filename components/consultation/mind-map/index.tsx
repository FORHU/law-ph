import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Undo2, Layout, Maximize, Palette, Check } from 'lucide-react';
import { MindMapProps } from './types';
import { MIND_MAP_COLORS, MIND_MAP_THEMES, MindMapThemeType } from './constants';
import { CustomNode } from './custom-node';

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
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

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
        return currentLayout === 'vertical' ? 220 : 120; 
      }
      let total = 0;
      children.forEach((child: any) => {
        total += calcSize(child);
      });
      const sizeWithPadding = Math.max(total + (children.length - 1) * 30, currentLayout === 'vertical' ? 220 : 120);
      subtreeSizes.set(item, sizeWithPadding);
      return sizeWithPadding;
    };

    calcSize(root);

    const traverse = (item: any, parentId: string | null = null, x = 0, y = 0, angleRange: [number, number] = [0, 360], depth = 0, side: 'left' | 'right' | 'top' | 'bottom' = 'right') => {
      const id = item.id || `node-${Math.random().toString(36).substr(2, 9)}`;
      const isRoot = id === 'root' || !parentId;
      const color = isRoot ? config.rootClass : config.nodeClass(colorIndex++);

      let label = item.label || item.text || 'Untitled';
      if (isRoot && (label === 'Case Analysis' || label === 'Legal Strategy Map')) {
        label = rootTitle;
      }

      nodes.push({
        id,
        type: 'custom',
        data: { 
          label, 
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
          const radius = isRoot ? 350 : 250;
          const [startAngle, endAngle] = angleRange;
          const totalAngle = endAngle - startAngle;
          const anglePerChild = totalAngle / children.length;

          children.forEach((child: any, index: number) => {
            const currentAngle = startAngle + (anglePerChild * index) + (anglePerChild / 2);
            // Normalize angle to 0-360
            const normalizedAngle = ((currentAngle % 360) + 360) % 360;
            
            const rad = (currentAngle * Math.PI) / 180;
            const cx = x + radius * Math.cos(rad);
            const cy = y + radius * Math.sin(rad);
            
            const childStart = startAngle + (anglePerChild * index);
            const childEnd = childStart + anglePerChild;
            
            // Map angle to the best handle on the root
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

          const leftSize = leftChildren.reduce((acc: number, c: any) => acc + (subtreeSizes.get(c) || 120), 0) + (leftChildren.length - 1) * 30;
          const rightSize = rightChildren.reduce((acc: number, acc_val: any) => acc + (subtreeSizes.get(acc_val) || 120), 0) + (rightChildren.length - 1) * 30;

          let leftOffset = -(leftSize / 2);
          leftChildren.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || 120;
            traverse(child, id, x - 400, y + (leftOffset + childSize / 2), [0,0], 1, 'left');
            leftOffset += childSize + 30;
          });

          let rightOffset = -(rightSize / 2);
          rightChildren.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || 120;
            traverse(child, id, x + 400, y + (rightOffset + childSize / 2), [0,0], 1, 'right');
            rightOffset += childSize + 30;
          });
        } else {
          const itemSize = subtreeSizes.get(item) || (currentLayout === 'vertical' ? 220 : 120);
          let offset = -(itemSize / 2);

          children.forEach((child: any) => {
            const childSize = subtreeSizes.get(child) || (currentLayout === 'vertical' ? 220 : 120);
            const posOffset = offset + (childSize / 2);
            
            if (currentLayout === 'vertical') {
              traverse(child, id, x + posOffset, y + 250);
            } else if (currentLayout === 'dual') {
              traverse(child, id, x + (side === 'left' ? -400 : 400), y + posOffset, [0,0], depth + 1, side);
            } else if (currentLayout === 'compact') {
              traverse(child, id, x + 300, y + posOffset);
            } else {
              traverse(child, id, x + 450, y + posOffset);
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
      console.log('--- MIND MAP DATA DEBUG ---');
      console.log('Raw Tree Data:', data);
      
      const { nodes: newNodes, edges: newEdges } = treeToGraph(data, theme, layout);
      
      console.log('Generated Nodes:', newNodes);
      console.log('Generated Edges:', newEdges);
      console.log('---------------------------');

      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [data, theme, layout, treeToGraph, setNodes, setEdges]);

  const handleLayoutChange = (newLayout: 'horizontal' | 'vertical' | 'compact' | 'radial' | 'dual') => {
    setLayout(newLayout);
    setIsThemeOpen(false);
  };

  useEffect(() => {
    if (nodesInitialized && nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 50);
    }
  }, [nodesInitialized, nodes.length, fitView]);

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
      data: { ...node.data, id: node.id, onEdit: handleEditNode, onAdd: handleAddNode, onDelete: handleDeleteNode }
    }));
  }, [nodes, handleEditNode, handleAddNode, handleDeleteNode]);

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setNodes(previousState.nodes);
    setEdges(previousState.edges);
  };

  return (
    <div className="w-full h-[calc(100vh-420px)] min-h-[450px] max-h-[750px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative transition-colors duration-500 scrollbar-hide flex flex-col" style={{ backgroundColor: themeConfig.bg }}>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none !important; }
        .scrollbar-hide { -ms-overflow-style: none !important; scrollbar-width: none !important; overflow: hidden !important; }
        .react-flow__viewport { transition: transform 0.5s ease; }
      `}</style>

      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={1}
          style={{ background: 'transparent' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={themeConfig.gridColor} gap={24} />
          <Controls className="!bg-[#0A0A0A] !border !border-white/20 !rounded-xl !overflow-hidden !shadow-2xl [&_button]:!bg-transparent [&_button]:!border-b [&_button]:!border-white/10 [&_button:last-child]:!border-b-0 [&_svg]:!fill-white hover:[&_button]:!bg-white/10 transition-all" />
        </ReactFlow>
      </div>

      {/* MINIMIZED Structure Selector - Top Left */}
      <div className="absolute top-4 left-4 z-[200] pointer-events-auto">
        <div className="relative">
          <button 
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-all border border-white/10 ${
              isThemeOpen ? 'bg-white text-black font-bold' : 'bg-[#E0A7C2] text-black font-bold shadow-[0_0_15px_rgba(224,167,194,0.3)] hover:scale-105 active:scale-95'
            }`}
          >
            <Layout size={12} />
            <span className="text-[9px] uppercase tracking-wider">Structure</span>
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
