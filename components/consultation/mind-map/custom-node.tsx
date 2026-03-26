import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

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
    <div className={`px-8 py-5 ${borderRadius} border-[4px] transition-all duration-300 min-w-[280px] max-w-[450px] group relative cursor-pointer hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:border-white/40 hover:scale-[1.05] ${data.color || 'bg-[#1A1A1A] border-[#333]'}`}>

      {/* Target Handle - Root doesn't usually have one, others do */}
      {!data.isRoot && (
        <Handle
          type="target"
          position={targetPos}
          className={`!w-4 !h-4 !border-white/20 !z-20 ${isLight ? '!bg-black' : '!bg-[#8B4564]'}`}
        />
      )}

      {/* Root Multi-Ports for Dual/Radial */}
      {isMultiPort && (
        <>
          <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Top} id="top" className="!w-3 !h-3 !bg-[#8B4564] !z-20" />
          <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-[#8B4564] !z-20" />
        </>
      )}

      {/* Primary Source Handle for standard branching */}
      {!isMultiPort && (
        <Handle
          type="source"
          position={sourcePos}
          className={`!w-4 !h-4 !border-white/20 !z-20 ${isLight ? '!bg-black' : '!bg-[#8B4564]'}`}
        />
      )}

      <div className="flex flex-col gap-1">
        <div className={`font-black leading-tight text-center ${isLight ? 'text-black' : 'text-white'} ${data.isRoot ? 'text-[42px]' : 'text-[32px]'}`}>
          {data.label}
        </div>
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
