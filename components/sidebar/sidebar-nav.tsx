// components/sidebar/sidebar-nav.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { NAV_ITEMS, SIDEBAR_STYLES, SidebarPage } from './sidebar-constants';

interface SidebarNavProps {
  activePage: SidebarPage;
}

export function SidebarNav({ activePage }: SidebarNavProps) {
  const router = useRouter();

  return (
    <div className={SIDEBAR_STYLES.navArea}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        
        return (
          <button 
            key={item.id}
            onClick={() => router.push(item.href)}
            className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive ? SIDEBAR_STYLES.activeItem : SIDEBAR_STYLES.inactiveItem
            }`}
          >
            <Icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
