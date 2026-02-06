'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, FileText, Plus } from 'lucide-react';

interface RecentItem {
  id: number;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

interface AppSidebarProps {
  activePage: 'chat' | 'documents';
  recentItems?: RecentItem[];
  onNewItem?: () => void;
  newItemLabel?: string;
  recentLabel?: string;
  showWorkspace?: boolean;
  workspaceTitle?: string;
  workspaceSubtitle?: string;
}

export function AppSidebar({
  activePage,
  recentItems = [],
  onNewItem,
  newItemLabel = 'New Item',
  recentLabel = 'RECENT',
  showWorkspace = false,
  workspaceTitle = 'Current Session',
  workspaceSubtitle = '',
}: AppSidebarProps) {
  const router = useRouter();

  return (
    <aside className="relative z-10 w-60 bg-[#2A1F1A]/80 backdrop-blur-sm border-r border-[#8B4564]/20 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#8B4564]/20">
        <button 
          onClick={() => router.push('/')}
          className="text-2xl font-semibold hover:opacity-80 transition-opacity"
        >
          <span className="text-white">ilove</span>
          <span className="text-[#8B4564]">lawyer</span>
        </button>
      </div>

      {/* New Item Button */}
      {onNewItem && (
        <div className="p-4">
          <button 
            onClick={onNewItem}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#8B4564]/20 to-[#8B4564]/20 border border-[#8B4564]/30 rounded-lg hover:from-[#8B4564]/30 hover:to-[#8B4564]/30 transition-all flex items-center justify-center gap-2 text-[#8B4564]"
          >
            <Plus size={18} />
            {newItemLabel}
          </button>
        </div>
      )}

      {/* Content Area (Workspace + Recent) */}
      <div className="px-4 py-2 flex-1 overflow-y-auto">
        {/* Workspace Section */}
        {showWorkspace && (
          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">WORKSPACE</h3>
            <div className="bg-[#3A2F2A]/50 border border-[#8B4564]/20 rounded-lg p-3 hover:bg-[#3A2F2A] transition-colors cursor-pointer">
              <div className="text-sm text-white mb-1">{workspaceTitle}</div>
              {workspaceSubtitle && (
                <div className="text-xs text-gray-400">{workspaceSubtitle}</div>
              )}
            </div>
          </div>
        )}

        {/* Recent Section */}
        {recentItems.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">{recentLabel}</h3>
            <div className="space-y-2">
              {recentItems.map((item) => (
                <div 
                  key={item.id}
                  className="py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-[#3A2F2A]/30 rounded-lg transition-colors cursor-pointer"
                  onClick={item.onClick}
                >
                  {item.title}
                  {item.subtitle && (
                    <div className="text-xs text-gray-400 mt-0.5">{item.subtitle}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-[#8B4564]/20 space-y-2">
        <button 
          onClick={() => router.push('/consultation')}
          className={`w-full px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
            activePage === 'chat'
              ? 'bg-[#3A2F2A]/50 border border-[#8B4564]/20 text-white'
              : 'hover:bg-[#3A2F2A]/30 text-gray-300 hover:text-white'
          }`}
        >
          <MessageSquare size={18} />
          <span className="text-sm">Chat</span>
        </button>
        <button 
          onClick={() => router.push('/documents')}
          className={`w-full px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
            activePage === 'documents'
              ? 'bg-[#3A2F2A]/50 border border-[#8B4564]/20 text-white'
              : 'hover:bg-[#3A2F2A]/30 text-gray-300 hover:text-white'
          }`}
        >
          <FileText size={18} />
          <span className="text-sm">Documents</span>
        </button>
      </div>
    </aside>
  );
}
