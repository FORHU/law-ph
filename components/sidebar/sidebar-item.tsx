// components/sidebar/sidebar-item.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Edit3, Trash2, Check, X } from 'lucide-react';
import { RecentItem, SIDEBAR_STYLES } from './sidebar-constants';

const PortalWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

interface SidebarItemProps {
  item: RecentItem;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function SidebarItem({ item, isOpen = false, onToggle }: SidebarItemProps) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');
  // Left: menuPosition local state is fine as it depends on the specific element ref
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({ 
        top: rect.top, 
        left: rect.right + 8 
      });
      setMenuPosition({ 
        top: rect.top, 
        left: rect.right + 8 
      });
      onToggle?.();
    }
    
    // Force blur to remove sticky focus/active styles
    if (buttonRef.current) {
      buttonRef.current.blur();
    }
  };

  const handleStartRename = () => {
    setEditingId(item.id);
    setEditValue(item.title);
    onToggle?.(); // Close menu when renaming starts
  };

  const handleSaveRename = () => {
    if (editValue.trim() && editValue !== item.title) {
      item.onRename?.(editValue);
    }
    setEditingId(null);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.portal-menu') && !target.closest('.menu-trigger')) {
          onToggle?.();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onToggle]);

  return (
    <div 
      className={`${SIDEBAR_STYLES.recentItem.base} ${
        editingId === item.id 
          ? SIDEBAR_STYLES.recentItem.editing 
          : SIDEBAR_STYLES.recentItem.hover
      }`}
      onClick={() => {
        if (editingId !== item.id) {
          item.onClick();
        }
      }}
    >
      <div className="pr-10 flex flex-col min-w-0 flex-1">
        {editingId === item.id ? (
          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center">
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 bg-black/40 border border-[#8B4564]/30 rounded-lg px-2 py-1.5 text-xs text-white font-medium outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564]/50 transition-all font-inter"
                placeholder="Rename consultation..."
              />
            </div>
          </div>
        ) : (
          <>
            <div className="truncate font-medium">{item.title}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 truncate uppercase tracking-wider">{item.subtitle || 'CONSULTATION'}</div>
          </>
        )}
      </div>

      {editingId !== item.id && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleMenuClick}
            className={`p-1.5 text-gray-500 hover:text-white rounded-lg transition-all menu-trigger outline-none focus:outline-none ${isOpen ? 'opacity-100 bg-[#8B4564]/40 text-white ring-1 ring-[#8B4564]/50' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
          >
            <MoreHorizontal size={14} />
          </button>

          <AnimatePresence>
            {isOpen && menuPosition && (
              <PortalWrapper>
                <motion.div
                  key={`menu-${item.id}`}
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  style={{ 
                    position: 'fixed', 
                    top: menuPosition.top, 
                    left: menuPosition.left,
                    zIndex: 9999 
                  }}
                  className="w-32 bg-[#1A1A1A] border border-[#8B4564]/30 rounded-xl shadow-2xl p-1.5 portal-menu"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleStartRename();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#8B4564]/20 rounded-lg transition-all"
                  >
                    <Edit3 size={14} />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      item.onRemove?.();
                      onToggle?.(); 
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </motion.div>
              </PortalWrapper>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
