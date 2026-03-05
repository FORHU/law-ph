import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Message } from './types';

interface TabConfigItem {
  id: string;
  label: string;
  icon: LucideIcon;
  countKey?: keyof Message;
}

interface AIResponseTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabConfig: readonly TabConfigItem[];
  message?: Message;
}

export function AIResponseTabs({ activeTab, onTabChange, tabConfig, message }: AIResponseTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-[#252525]/80 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-2xl flex-1 md:flex-none">
      {tabConfig.map((tab) => {
    

        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = tab.countKey && message ? (message[tab.countKey] as any[])?.length : null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[#8B4564]/30 text-[#E0A7C2] border border-[#8B4564]/40 shadow-inner'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
