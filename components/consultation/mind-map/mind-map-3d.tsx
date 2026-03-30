'use client';

import React, { useRef, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { MindMapItem } from './types';

interface MindMap3DProps {
  root: MindMapItem | null;
  onNodeClick: (node: any) => void;
  onBackgroundClick?: () => void;
}

export interface MindMap3DHandle {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const MindMap3D = forwardRef<MindMap3DHandle, MindMap3DProps>(({ root, onNodeClick, onBackgroundClick }, ref) => {
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

  const applyTightZoom = useCallback((duration = 1000) => {
    if (!fgRef.current) return;
    // First calculate standard zooming boundaries
    fgRef.current.zoomToFit(duration, 0);
    // Let the animation finish, then aggressively drive the camera in by 45%
    setTimeout(() => {
      if (fgRef.current) {
        const cam = fgRef.current.camera();
        fgRef.current.cameraPosition(
          { x: 0, y: 0, z: cam.position.z * 0.55 },
          { x: 0, y: 0, z: 0 },
          400
        );
      }
    }, duration + 50);
  }, []);

  // Public API for the parent component
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

  // Convert the hierarchical tree into a FLAT list of nodes and links for ForceGraph3D
  // RESTORED: Stable Fixed Wedge-Based Radial Brainstorm
  const graphData = useMemo(() => {
    if (!root) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];

    // 1. Calculate Leaf Weights for Perfect Symmetry
    const leafMap = new Map();
    const calculateLeaves = (node: any) => {
      const children = node.children || [];
      if (children.length === 0) {
        leafMap.set(node.id, 1);
        return 1;
      }
      let sum = 0;
      children.forEach((c: any) => sum += calculateLeaves(c));
      leafMap.set(node.id, sum);
      return sum;
    };
    calculateLeaves(root);

    // 2. Leaf-Weighted Concentric Radial Layout
    const traverse = (item: MindMapItem, depth = 0, angleStart = 0, angleEnd = 2 * Math.PI) => {
      // Place node exactly in the middle of its assigned wedge
      const midAngle = (angleStart + angleEnd) / 2;
      
      // Perfect concentric circles: each depth level is exactly 240 units further out
      const radius = depth * 240; 
      
      const x = radius * Math.cos(midAngle);
      const y = radius * Math.sin(midAngle);
      const z = depth === 0 ? 0 : (depth % 2 === 0 ? 30 : -30);

      nodes.push({
        id: item.id,
        label: item.label,
        description: item.description || '',   // For the detail panel
        media: item.media || [],               // Evidence gallery
        isRoot: depth === 0,
        // Center-locked exact positions
        fx: x, fy: y, fz: z
      });

      const children = item.children || [];
      if (children.length > 0) {
        const totalLeaves = leafMap.get(item.id);
        let currentAngle = angleStart;
        
        children.forEach((child: any) => {
          links.push({ source: item.id, target: child.id });
          
          // Distribute wedge proportionally based on how many sub-nodes exist inside this child
          const childLeaves = leafMap.get(child.id);
          const angleShare = (childLeaves / totalLeaves) * (angleEnd - angleStart);
          
          traverse(child, depth + 1, currentAngle, currentAngle + angleShare);
          currentAngle += angleShare;
        });
      }
    };

    traverse(root, 0, 0, 2 * Math.PI);
    return { nodes, links };
  }, [root]);

  // Adjust camera and simulation forces
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link').distance(150);
      fgRef.current.d3Force('charge').strength(-1500);
      hasFittedInitial.current = false;
    }
  }, [graphData]);

  // Custom Node Renderer
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();

    // High-impact neon sphere
    const geometry = new THREE.SphereGeometry(node.isRoot ? 10 : 6, 32, 32);
    const sphere = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#00E5FF',
        emissive: '#00E5FF',
        emissiveIntensity: 3.5,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
      })
    );
    group.add(sphere);

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
      context.fillStyle = 'rgba(10, 10, 10, 0.85)';
      context.beginPath();
      context.roundRect?.(0, 0, canvas.width, canvas.height, 12);
      context.fill();

      context.strokeStyle = node.isRoot ? '#8B4564' : 'rgba(255,255,255,0.3)';
      context.lineWidth = 4;
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
      // Slightly reduced physical 3D dimension so zoomToFit can push the camera closer
      sprite.scale.set(node.isRoot ? 34 * aspectRatio : 24 * aspectRatio, node.isRoot ? 34 : 24, 1);
      sprite.position.y = 12;
      group.add(sprite);
    }

    return group;
  }, []);

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
        linkColor={() => '#00E5FF'}
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
        cooldownTicks={0}
        d3AlphaDecay={0.08}
        d3VelocityDecay={0.5}
        onEngineStop={() => {
          if (fgRef.current && graphData.nodes.length > 0 && !hasFittedInitial.current) {
            setTimeout(() => {
              if (fgRef.current) {
                applyTightZoom(800);
                hasFittedInitial.current = true;
              }
            }, 600);
          }
        }}
      />
    </div>
  );
});

MindMap3D.displayName = 'MindMap3D';
