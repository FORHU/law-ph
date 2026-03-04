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
          className="w-64 bg-[#1A1A1A] border-[#8B4564]/30 text-white shadow-2xl mb-2 rounded-2xl"
        >
          <DropdownMenuLabel className="text-gray-400 font-normal py-3 px-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-white">{user.email}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500"> Account Signed in</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#8B4564]/20" />
          <DropdownMenuItem
            onClick={() => router.push('/settings')}
            className="py-2.5 px-4 focus:bg-[#8B4564]/20 focus:text-white cursor-pointer transition-colors"
          >
            <User className="mr-2 h-4 w-4 text-gray-400" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2.5 px-4 focus:bg-[#8B4564]/20 focus:text-white cursor-pointer transition-colors">
            <SunMoon className="mr-2 h-4 w-4 text-gray-400" />
            <span>Theme Toggle</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2.5 px-4 focus:bg-[#8B4564]/20 focus:text-white cursor-pointer transition-colors">
            <Settings className="mr-2 h-4 w-4 text-gray-400" />
            <span>General Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#8B4564]/20" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="py-2.5 px-4 focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
