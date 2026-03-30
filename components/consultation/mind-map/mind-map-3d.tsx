'use client';

import React, { useRef, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { MindMapItem } from './types';

interface MindMap3DProps {
  root: MindMapItem | null;
  onNodeClick: (node: any) => void;
  onBackgroundClick?: () => void;
  rootTitle?: string;
  themeColor?: string;
}

export interface MindMap3DHandle {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const MindMap3D = forwardRef<MindMap3DHandle, MindMap3DProps>(({ root, onNodeClick, onBackgroundClick, rootTitle = "Case Analysis", themeColor = '#00E5FF' }, ref) => {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const hasFittedInitial = useRef(false);

  // Track dimensions for perfect centering
  const [dims, setDims] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDims({ width: clientWidth, height: clientHeight });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Convert the hierarchical tree into a FLAT list of nodes and links for ForceGraph3D
  // RESTORED: Stable Fixed Wedge-Based Radial Brainstorm
  const graphData = useMemo(() => {
    if (!root) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];

    // Robust field extraction matching index.tsx
    const getChildren = (item: any) => item.children || item.items || item.subnodes || item.branches || item.subitems || [];
    const getLabel = (item: any) => item.label || item.text || item.title || 'Untitled';
    const getDescription = (item: any) => item.description || item.details || item.summary || item.content || '';
    const getMedia = (item: any) => item.media || item.evidence || item.attachments || [];

    // ID Memoization to handle data without consistent IDs
    const idMap = new WeakMap();
    const getId = (item: any) => {
      if (item.id) return item.id;
      if (!idMap.has(item)) idMap.set(item, `node-${Math.random().toString(36).substr(2, 9)}`);
      return idMap.get(item);
    };

    // 1. Calculate Leaf Weights for Perfect Symmetry
    const leafMap = new Map();
    const calculateLeaves = (node: any) => {
      const children = getChildren(node);
      const nodeId = getId(node);
      if (children.length === 0) {
        leafMap.set(nodeId, 1);
        return 1;
      }
      let sum = 0;
      children.forEach((c: any) => sum += calculateLeaves(c));
      leafMap.set(nodeId, sum);
      return sum;
    };
    calculateLeaves(root);

    // 2. Leaf-Weighted Concentric Radial Layout
    const traverse = (item: any, depth = 0, angleStart = 0, angleEnd = 2 * Math.PI) => {
      const isRoot = depth === 0;
      const nodeId = getId(item);
      let label = getLabel(item);
      
      if (isRoot && (label === 'Case Analysis' || label === 'Legal Strategy Map')) {
        label = rootTitle;
      }

      const midAngle = (angleStart + angleEnd) / 2;
      const radius = depth * 240; 
      
      const x = radius * Math.cos(midAngle);
      const y = radius * Math.sin(midAngle);
      
      // True 3D Scatter: Create a 'saddle curve' by sweeping the Z-axis up and down 
      // based on the branch's rotation, resulting in a stunning spherical constellation.
      const zWave = Math.sin(midAngle * 3) * (radius * 0.85);
      const z = isRoot ? 0 : zWave + (depth % 2 === 0 ? 40 : -40);

      nodes.push({
        id: nodeId,
        label,
        description: getDescription(item),
        media: getMedia(item),
        isRoot,
        fx: x, fy: y, fz: z,
        color: isRoot ? '#8B4564' : themeColor
      });

      const children = getChildren(item);
      if (children.length > 0) {
        const totalLeaves = leafMap.get(nodeId);
        let currentAngle = angleStart;
        
        children.forEach((child: any) => {
          const childId = getId(child);
          links.push({ source: nodeId, target: childId });
          
          const childLeaves = leafMap.get(childId);
          const angleShare = (childLeaves / (totalLeaves || 1)) * (angleEnd - angleStart);
          
          traverse(child, depth + 1, currentAngle, currentAngle + angleShare);
          currentAngle += angleShare;
        });
      }
    };

    traverse(root, 0, 0, 2 * Math.PI);
    return { nodes, links };
  }, [root, rootTitle, themeColor]);

  const applyTightZoom = useCallback((duration = 1000) => {
    if (!fgRef.current) return;
    
    const nodes = graphData.nodes;
    if (!nodes || nodes.length === 0) return;
    
    let maxRadius = 0;
    for (const n of nodes) {
      const r = Math.hypot(n.x || n.fx || 0, n.y || n.fy || 0, n.z || n.fz || 0);
      if (r > maxRadius) maxRadius = r;
    }
    
    const distance = Math.max(maxRadius * 1.6, 600);
    fgRef.current.cameraPosition(
      { x: 0, y: 0, z: distance }, 
      { x: 0, y: 0, z: 0 }, 
      duration
    );
  }, [graphData]);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      applyTightZoom(1000);
    },
    zoomIn: () => {
      if (fgRef.current) {
        const cam = fgRef.current.camera();
        cam.position.z *= 0.8;
      }
    },
    zoomOut: () => {
      if (fgRef.current) {
        const cam = fgRef.current.camera();
        cam.position.z *= 1.2;
      }
    }
  }));

  // Adjust camera and simulation forces
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link').distance(150);
      fgRef.current.d3Force('charge').strength(-1500);
      
      // Auto-fit view ONLY ONCE on initial load
      if (graphData.nodes.length > 0 && !hasFittedInitial.current) {
        const timeoutId = setTimeout(() => {
          if (fgRef.current) {
            applyTightZoom(800);
            hasFittedInitial.current = true;
          }
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]); 

  // Custom Node Renderer
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const isSelected = selectedNodeId === node.id;
    const nodeColor = node.color || themeColor;

    // High-impact neon sphere
    const baseSize = node.isRoot ? 10 : 6;
    const size = isSelected ? baseSize * 1.5 : baseSize;
    
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const sphere = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: isSelected ? 8.0 : 3.5,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
      })
    );
    group.add(sphere);

    // Label Sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const text = node.label || '';
      const fontSize = 48;
      context.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
      const textWidth = context.measureText(text).width;

      canvas.width = textWidth + 80;
      canvas.height = fontSize + 40;

      // Pill Background
      context.fillStyle = isSelected ? 'rgba(30, 30, 30, 0.95)' : 'rgba(10, 10, 10, 0.85)';
      context.beginPath();
      context.roundRect?.(0, 0, canvas.width, canvas.height, 12);
      context.fill();

      context.strokeStyle = isSelected ? '#ffffff' : nodeColor;
      context.lineWidth = 6;
      context.stroke();

      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);

      const aspectRatio = canvas.width / canvas.height;
      sprite.scale.set(node.isRoot ? 34 * aspectRatio : 24 * aspectRatio, node.isRoot ? 34 : 24, 1);
      sprite.position.y = size + 10;
      group.add(sprite);
    }

    return group;
  }, [selectedNodeId, themeColor]);

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current) {
      const distance = 350; // Comfortable reading distance
      const hypot = Math.hypot(node.x || 0, node.y || 0, node.z || 0);

      let camPos;
      // CRITICAL FIX: Prevent divide-by-zero Infinity math when clicking the root (0,0,0) center node
      if (hypot < 0.1 || isNaN(hypot)) {
        camPos = { x: 0, y: 0, z: distance };
      } else {
        const distRatio = 1 + distance / hypot;
        camPos = { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio };
      }

      fgRef.current.cameraPosition(
        camPos,
        node,
        1000
      );
    }
    setSelectedNodeId(node.id);
    onNodeClick(node);
  }, [onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050505]/40 backdrop-blur-sm">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeAutoColorBy="id"
        nodeThreeObject={nodeThreeObject}
        linkWidth={3.0}
        linkColor={() => themeColor}
        linkDirectionalParticles={0}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => {
          if (fgRef.current && selectedNodeId) {
            applyTightZoom(1000);
            setSelectedNodeId(null);
            if (onBackgroundClick) onBackgroundClick();
          }
        }}
        enablePointerInteraction={true}
        enableNodeDrag={false}
        enableNavigationControls={true}
        showNavInfo={false}
        cooldownTicks={1}
        d3AlphaDecay={0.08}
        d3VelocityDecay={0.5}
      />
    </div>
  );
});

MindMap3D.displayName = 'MindMap3D';
