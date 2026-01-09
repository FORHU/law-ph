
import { createClient } from '@/lib/supabase/client';
import React from 'react';

interface FooterProps {
  isLoggedIn?: boolean
}

export function Footer({ isLoggedIn} : FooterProps){

  const handleLogout = async () => {
        const supabase = createClient()
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
        else console.log('User signed out successfully!');
  }
  return (
    <footer className="border-t border-border-dark bg-background-dark py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500 text-2xl">balance</span>
            <span className="text-xl font-bold tracking-tight">LexPH</span>
          </div>
          <p className="text-sm text-slate-500 max-w-xs text-center md:text-left">
            Empowering Filipinos with accessible legal information through artificial intelligence.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-6">
          <div className="flex gap-8">
            <a href="#" className="text-sm text-slate-400 hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-slate-400 hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-sm text-slate-400 hover:text-primary transition-colors">Contact</a>
          </div>
          <span className="text-xs text-slate-600">© 2024 LexPH. Built for the Filipino people. All rights reserved.</span>
         {isLoggedIn && ( <span className="text-sm text-blue-400 cursor-pointer" onClick={handleLogout}>Logout</span>)}
        </div>
      </div>
    </footer>
  );
};

