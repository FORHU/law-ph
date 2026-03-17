import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Edit2, Plus, Trash2 } from 'lucide-react';

export const CustomNode = memo(({ data }: any) => {
  const isVibrant = data.theme === 'vibrant';
  const borderRadius = isVibrant ? 'rounded-full' : (data.theme === 'classic' ? 'rounded-none' : 'rounded-xl');
  
  const isVertical = data.layout === 'vertical';
  const isRadial = data.layout === 'radial';
  const isDual = data.layout === 'dual';
  const isLeft = data.side === 'left';
  const isRight = data.side === 'right';
  const isTop = data.side === 'top';
  const isBottom = data.side === 'bottom';
  const isLight = data.theme === 'classic' && !data.isRoot;
  
  // Logic to determine handle positions based on layout
  let targetPos = Position.Left;
  let sourcePos = Position.Right;

  if (isVertical) {
    targetPos = Position.Top;
    sourcePos = Position.Bottom;
  } else if (isDual || isRadial) {
    // Advanced positioning for Radial/Dual
    if (isLeft) {
      targetPos = Position.Right;
      sourcePos = Position.Left;
    } else if (isRight) {
      targetPos = Position.Left;
      sourcePos = Position.Right;
    } else if (isTop) {
      targetPos = Position.Bottom;
      sourcePos = Position.Top;
    } else if (isBottom) {
      targetPos = Position.Top;
      sourcePos = Position.Bottom;
    }
  }

  // Root nodes in Dual/Radial need multi-directional branching
  const isMultiPort = data.isRoot && (isDual || isRadial);

  return (
    <div className={`px-5 py-3 ${borderRadius} border-2 transition-all min-w-[180px] max-w-[260px] group relative ${data.color || 'bg-[#1A1A1A] border-[#333]'}`}>
      
      {/* Target Handle - Root doesn't usually have one, others do */}
      {!data.isRoot && (
        <Handle 
          type="target" 
          position={targetPos} 
          className={`!w-2.5 !h-2.5 !border-white/20 !z-20 ${isLight ? '!bg-black' : '!bg-[#8B4564]'}`} 
        />
      )}
      
      {/* Root Multi-Ports for Dual/Radial */}
      {isMultiPort && (
        <>
          <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Top} id="top" className="!w-2 !h-2 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-[#8B4564] !z-20" />
        </>
      )}

      {/* Primary Source Handle for standard branching */}
      {!isMultiPort && (
        <Handle 
          type="source" 
          position={sourcePos} 
          className={`!w-2.5 !h-2.5 !border-white/20 !z-20 ${isLight ? '!bg-black' : '!bg-[#8B4564]'}`} 
        />
      )}
      
      <div className="flex flex-col gap-1">
        <div className={`font-bold text-[13px] leading-snug text-center ${isLight ? 'text-black' : 'text-white/90'}`}>
          {data.label}
        </div>
      </div>

      <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[30]">
        <button 
          onClick={(e) => { e.stopPropagation(); data.onEdit?.(data.id); }}
          className="p-1.5 bg-black/80 hover:bg-black border border-white/10 rounded-lg text-white shadow-xl"
        >
          <Edit2 size={12} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); data.onAdd?.(data.id); }}
          className="p-1.5 bg-black/80 hover:bg-black border border-white/10 rounded-lg text-white shadow-xl"
        >
          <Plus size={12} />
        </button>
        {!data.isRoot && (
          <button 
            onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
            className="p-1.5 bg-red-900/80 hover:bg-red-900 border border-white/10 rounded-lg text-white shadow-xl"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
