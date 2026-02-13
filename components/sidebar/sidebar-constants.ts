// components/sidebar/sidebar-constants.ts
import { MessageSquare, FileText, Calendar } from 'lucide-react';

export interface RecentItem {
  id: string | number;
  title: string;
  subtitle?: string;
  onClick: () => void;
  onRemove?: () => void;
  onRename?: (newTitle: string) => void;
}

export type SidebarPage = 'chat' | 'documents' | 'calendar';

export interface NavItem {
  id: SidebarPage;
  label: string;
  icon: any;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/consultation' },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
];

export const SIDEBAR_STYLES = {
  container: "w-60 bg-[#2A1F1A] border-r border-[#8B4564]/30 flex flex-col h-full shadow-2xl overflow-visible",
  contentArea: "px-4 py-2 flex-1 overflow-y-auto scroll-smooth overflow-x-visible custom-sidebar-scrollbar",
  navArea: "p-4 border-t border-[#8B4564]/10 space-y-2",
  activeItem: "bg-[#8B4564]/20 border border-[#8B4564]/30 text-white shadow-lg",
  inactiveItem: "hover:bg-white/5 text-gray-400 hover:text-white",
  recentItem: {
    base: "group relative py-3 px-4 text-sm rounded-xl transition-all cursor-pointer border border-transparent",
    editing: "bg-[#3A2F2A] border-[#8B4564]/40",
    hover: "text-gray-400 hover:text-white hover:bg-[#3A2F2A]/40"
  }
};
