import React from 'react';
import { BookOpen, Mail, Calendar, History, GitGraph } from 'lucide-react';

const icons: Record<string, any> = {
  BookOpen,
  Mail,
  Calendar,
  History,
  GitGraph
};

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

interface AIResponseTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabConfig: TabConfig[];
}

export function AIResponseTabs({ activeTab, onTabChange, tabConfig }: AIResponseTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-[#252525]/80 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-2xl flex-1 md:flex-none">
      {tabConfig.map((tab) => {
        const Icon = icons[tab.icon];
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all ${
              isActive 
                ? 'bg-[#8B4564]/30 text-white shadow-lg ring-1 ring-white/10' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {Icon && <Icon size={14} className={isActive ? 'text-[#E0A7C2]' : 'text-gray-500'} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
