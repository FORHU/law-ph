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

  const hasImageOrAudio = data.media?.some((m: any) => m.type === 'image' || m.type === 'audio');

  return (
    <div className={`${hasImageOrAudio ? 'px-3 py-2 max-w-[180px] min-w-[140px]' : 'px-8 py-5 min-w-[280px] max-w-[450px]'} ${borderRadius} border-[4px] transition-all duration-300 group relative cursor-pointer hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:border-white/40 hover:scale-[1.05] ${data.color || 'bg-[#1A1A1A] border-[#333]'}`}>

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
        {/* Label — compact header when media is present, large when text-only */}
        <div className={`font-black leading-tight text-center ${isLight ? 'text-black' : 'text-white'} ${data.isRoot
            ? 'text-[42px]'
            : data.media && data.media.length > 0
              ? 'text-[20px] font-bold opacity-90 uppercase tracking-wider truncate'
              : 'text-[32px]'
          }`}>
          {data.label}
        </div>

        {/* Rich Media Embedding directly ON the Node for Lawyers */}
        {data.media && data.media.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {data.media.map((item: any, idx: number) => {
              if (item.type === 'image') return (
                <div key={idx} className="relative group/media overflow-hidden rounded-xl border-2 border-white/10 shadow-lg">
                  <img src={item.url} alt={item.name} className="w-full h-auto max-h-[220px] object-cover transition-transform group-hover/media:scale-105" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1">
                    <span className="text-[10px] text-white/70 truncate block">{item.name}</span>
                  </div>
                </div>
              );
              if (item.type === 'audio') return (
                <div key={idx} className="flex flex-col gap-1.5 w-full bg-[#050505]/60 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
                  <span className="text-[11px] font-bold text-[#E0A7C2] truncate uppercase tracking-widest">{item.name}</span>
                  <audio controls className="w-full h-9 rounded-md"><source src={item.url} /></audio>
                </div>
              );
              if (item.type === 'file') return (
                <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-[#0A0A0A] p-2.5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-[#E0A7C2]/50 transition-all shadow-lg">
                  <div className="bg-[#E0A7C2] text-black w-8 h-8 flex items-center justify-center rounded-lg font-bold text-lg shrink-0">📄</div>
                  <span className="text-sm font-medium truncate text-white/90">{item.name}</span>
                </a>
              );
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
