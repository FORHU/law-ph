'use client';

import React, { useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { MindMapItem } from '@/lib/citation-parser';
import * as THREE from 'three';

// Dynamic import to avoid SSR issues with ForceGraph
const ForceGraph3D = dynamic(() => import('react-force-graph-3d').then(mod => mod.default), { ssr: false }) as any;

interface MindMap3DProps {
  root: MindMapItem;
  onNodeClick: (node: any) => void;
}

export interface MindMap3DHandle {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const MindMap3D = forwardRef<MindMap3DHandle, MindMap3DProps>(({ root, onNodeClick }, ref) => {
  const fgRef = useRef<any>(null);

  // Track dimensions for perfect centering
  const [dims, setDims] = React.useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
        setDims({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
        });

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDims({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(1000, 150);
      }
    },
    zoomIn: () => {
      if (fgRef.current) {
        const cam = fgRef.current.camera();
        const dist = cam.position.length();
        const newDist = dist * 0.8;
        const ratio = newDist / dist;
        // Zoom and LookAt Origin
        fgRef.current.cameraPosition(
          { x: cam.position.x * ratio, y: cam.position.y * ratio, z: cam.position.z * ratio },
          { x: 0, y: 0, z: 0 },
          500
        );
      }
    },
    zoomOut: () => {
      if (fgRef.current) {
        const cam = fgRef.current.camera();
        const dist = cam.position.length();
        const newDist = dist * 1.25;
        const ratio = newDist / dist;
        // Zoom and LookAt Origin
        fgRef.current.cameraPosition(
          { x: cam.position.x * ratio, y: cam.position.y * ratio, z: cam.position.z * ratio },
          { x: 0, y: 0, z: 0 },
          500
        );
      }
    }
  }));

  // Flatten the tree for ForceGraph3D
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    const traverse = (item: MindMapItem, parentId?: string) => {
      const node = {
        id: item.id,
        label: item.label,
        description: item.description,
        isRoot: item.isRoot,
        val: item.isRoot ? 35 : 18 // Slightly larger nodes for impact
      };
      nodes.push(node);

      if (parentId) {
        links.push({
          source: parentId,
          target: item.id
        });
      }

      if (item.children) {
        item.children.forEach(child => traverse(child, item.id));
      }
    };

    traverse(root);
    return { nodes, links };
  }, [root]);

  // Adjust camera and simulation forces
  useEffect(() => {
    if (fgRef.current) {
      // Configuration
      fgRef.current.d3Force('link').distance(180);
      fgRef.current.d3Force('charge').strength(-800); // Stronger repulsion to prevent clustering
      
      // Settle and fit
      const timer = setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(1000, 150);
        }
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [graphData, dims]);

  // Custom Node Renderer
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(node.isRoot ? 8 : 5, 24, 24),
      new THREE.MeshStandardMaterial({
        color: node.isRoot ? '#8B4564' : '#E0A7C2',
        emissive: node.isRoot ? '#8B4564' : '#E0A7C2',
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
      })
    );
    group.add(sphere);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
        const text = node.label;
        const fontSize = 48;
        context.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
        const textWidth = context.measureText(text).width;
        
        canvas.width = textWidth + 80;
        canvas.height = fontSize + 40;
        
        context.fillStyle = 'rgba(10, 10, 10, 0.85)';
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
        sprite.scale.set(7 * aspectRatio, 7, 1);
        sprite.position.y = 14;
        group.add(sprite);
    }

    return group;
  }, []);

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
        linkWidth={1.5}
        linkColor={() => 'rgba(224, 167, 194, 0.25)'}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => '#E0A7C2'}
        onNodeClick={onNodeClick}
        enablePointerInteraction={true}
        enableNodeDrag={true}
        showNavInfo={false}
      />
    </div>
  );
});

MindMap3D.displayName = 'MindMap3D';
