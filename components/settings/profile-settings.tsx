'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLayout } from '@/components/ui/page-layout';
import { User, Mail, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ProfileSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [successBanner, setSuccessBanner] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const googleStatus = user === undefined ? 'loading' : user?.googleAccessToken ? 'connected' : 'disconnected';

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  useEffect(() => {
    if (searchParams?.get('auth_success') === 'true') {
      setSuccessBanner(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_success');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setSuccessBanner(false), 6000);
    }
  }, [searchParams]);

  const handleConnectGoogle = () => {
    setCheckingAuth(true);
    window.location.href = `/auth/login?redirect=/settings`;
  };

  return (
    <PageLayout
      activePage="chat"
      title="Profile Settings"
      subtitle="Manage your account and connected services"
      onBack={() => router.back()}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-6 px-4 py-8 overflow-y-auto h-full">

        {successBanner && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-green-500/20 bg-green-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-bold text-sm uppercase tracking-widest">Google Account Connected</p>
              <p className="text-green-400/60 text-xs mt-0.5">Your Google Calendar and Gmail are now linked.</p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-3xl border border-[#722f37]/30 bg-[#0B0B0C] overflow-hidden shadow-xl shadow-[#722f37]/5">
          <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#722f37]/15 to-transparent flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#722f37] flex items-center justify-center text-lg font-bold text-white shadow-xl shadow-[#722f37]/30 flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-white font-serif text-xl">{displayName}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-xs">
                <Mail size={11} />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            <div className="flex items-center gap-4 px-6 py-4">
              <User size={14} className="text-[#e9c176] flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-0.5">Display Name</p>
                <p className="text-sm text-white">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-4">
              <Mail size={14} className="text-[#e9c176] flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-0.5">Email Address</p>
                <p className="text-sm text-white">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="rounded-3xl border border-[#722f37]/30 bg-[#0B0B0C] overflow-hidden shadow-xl shadow-[#722f37]/5">
          <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#722f37]/15 to-transparent">
            <h3 className="text-white font-serif text-lg">Connected <span className="text-[#e9c176] italic">Accounts</span></h3>
            <p className="text-gray-600 text-xs mt-1">Link external services to let the AI assistant access your calendar and emails.</p>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)' }}>
                  G
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Google Calendar &amp; Gmail</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {googleStatus === 'loading' ? (
                      <Loader2 size={11} className="animate-spin text-gray-500" />
                    ) : googleStatus === 'connected' ? (
                      <CheckCircle2 size={11} className="text-green-400" />
                    ) : (
                      <AlertCircle size={11} className="text-gray-600" />
                    )}
                    <span className={`text-[11px] ${googleStatus === 'connected' ? 'text-green-400' : 'text-gray-600'}`}>
                      {googleStatus === 'loading' ? 'Checking...' : googleStatus === 'connected' ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>
              </div>
              {googleStatus === 'loading' ? (
                <div className="w-24 h-9 rounded-xl bg-white/5 animate-pulse" />
              ) : googleStatus === 'connected' ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 text-[11px] font-bold uppercase tracking-widest">
                  <CheckCircle2 size={12} />
                  Connected
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  disabled={checkingAuth}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#722f37] hover:bg-[#8b3a44] text-white text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#722f37]/20 active:scale-95 disabled:opacity-60"
                >
                  {checkingAuth ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                  {checkingAuth ? 'Redirecting...' : 'Connect Google'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Connecting Google grants the AI assistant read access to your Gmail and full access to your Google Calendar so it can book consultations and check schedules on your behalf. You can revoke access at any time from your{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#722f37] underline underline-offset-2 hover:text-[#e9c176] transition-colors">
                Google Account settings
              </a>.
            </p>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
