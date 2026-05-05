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
    <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#0B0B0C]/90 backdrop-blur-md rounded-lg p-1 mb-1 border border-[#722f37]/20 shadow-2xl">
      {tabConfig.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = tab.countKey && message ? (message[tab.countKey] as any[])?.length : null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all flex-1 md:flex-none ${isActive
                ? 'bg-[#722f37]/40 text-white border border-[#e9c176]/30 shadow-inner'
                : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
          >
            <Icon size={14} className={isActive ? "text-gray-200" : "text-current"} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
