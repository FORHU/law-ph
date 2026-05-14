'use client';

import React from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { SIDEBAR_STYLES } from './sidebar-constants';
import { COLORS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, SunMoon, User } from 'lucide-react';

export function SidebarProfile() {
  const { session, supabase } = useAuth();
  const router = useRouter();
  const user = session?.user;

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className={SIDEBAR_STYLES.profileArea}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-3 p-2 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 transition-all group">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-active:scale-95"
              style={{ backgroundColor: COLORS.PRIMARY, color: 'white' }}
            >
              {initials}
            </div>
            <div className="flex flex-col text-left overflow-hidden flex-1">
              <span className="text-sm font-medium text-white truncate">{displayName}</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-64 bg-[#0B0B0C]/95 backdrop-blur-xl border-[#722f37]/30 text-white shadow-2xl mb-2 rounded-2xl"
        >
          <DropdownMenuLabel className="text-gray-400 font-normal py-4 px-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-white font-serif">{user.email}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Institutional Account</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#722f37]/20" />
          <DropdownMenuItem
            onClick={() => router.push('/settings')}
            className="py-3 px-5 focus:bg-[#722f37]/20 focus:text-white cursor-pointer transition-colors text-[11px] font-bold uppercase tracking-widest"
          >
            <User className="mr-3 h-4 w-4 text-gray-500" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-3 px-5 focus:bg-[#722f37]/20 focus:text-white cursor-pointer transition-colors text-[11px] font-bold uppercase tracking-widest">
            <SunMoon className="mr-3 h-4 w-4 text-gray-500" />
            <span>Theme Control</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-3 px-5 focus:bg-[#722f37]/20 focus:text-white cursor-pointer transition-colors text-[11px] font-bold uppercase tracking-widest">
            <Settings className="mr-3 h-4 w-4 text-gray-500" />
            <span>General Config</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#722f37]/20" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="py-3 px-5 focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer transition-colors text-[11px] font-bold uppercase tracking-widest"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
