// components/sidebar/sidebar-constants.ts
import { MessageSquare, FileText, Calendar, Mic } from 'lucide-react';

export interface RecentItem {
  id: string | number;
  title: string;
  subtitle?: string;
  onClick: () => void;
  onRemove?: () => void;
  onRename?: (newTitle: string) => void;
}

export type SidebarPage = 'chat' | 'documents' | 'transcribe' | 'calendar' | 'cases' | 'auth' | 'library';

export interface NavItem {
  id: SidebarPage;
  label: string;
  icon: any;
  href: string;
}

export const SCROLL_THRESHOLD = 50;

export const NAV_ITEMS: NavItem[] = [
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  { id: 'transcribe', label: 'Transcribe', icon: Mic, href: '/transcribe' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/consultation' },
];

export const SIDEBAR_STYLES = {
  container: "w-60 bg-[#0B0B0C] border-r border-[#722f37]/30 flex flex-col h-full shadow-2xl overflow-hidden relative",
  contentArea: "px-4 py-2",
  navArea: "p-4 border-t border-[#722f37]/10 space-y-2",
  activeItem: "bg-[#722f37]/20 border border-[#722f37]/30 text-white shadow-lg shadow-[#722f37]/5",
  inactiveItem: "hover:bg-white/5 text-gray-400 hover:text-white",
  recentItem: {
    base: "group relative py-3 px-4 text-sm rounded-xl transition-all cursor-pointer border border-transparent",
    editing: "bg-[#111111] border-[#722f37]/40",
    hover: "text-gray-400 hover:text-white hover:bg-[#111111]/40",
    active: "bg-[#722f37]/20 border-[#722f37]/40 text-white shadow-lg shadow-[#722f37]/5"
  },
  profileArea: "mt-auto p-4 border-t border-[#722f37]/10 bg-[#0B0B0C]/95 backdrop-blur-md sticky bottom-0 z-20"
};
