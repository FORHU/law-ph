'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { COLORS } from '@/lib/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
} from 'lucide-react';

const CHAT_WONDER_API = process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || 'http://localhost:8001';

type GoogleAuthStatus = 'loading' | 'connected' | 'disconnected';

export function ProfileSettings() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = session?.user;

  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus>('loading');
  const [successBanner, setSuccessBanner] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const getSessionId = (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('chat_session_id') : null;

  const checkGoogleStatus = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setGoogleStatus('disconnected');
      return;
    }
    try {
      const res = await fetch(`${CHAT_WONDER_API}/auth/status?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data.authenticated ? 'connected' : 'disconnected');
      } else {
        setGoogleStatus('disconnected');
      }
    } catch {
      setGoogleStatus('disconnected');
    }
  }, []);

  // On mount: detect ?auth_success=true and check Google status
  useEffect(() => {
    const authSuccess = searchParams.get('auth_success');
    if (authSuccess === 'true') {
      setSuccessBanner(true);
      // Clean the URL without a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_success');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setSuccessBanner(false), 6000);
    }
    checkGoogleStatus();
  }, [searchParams, checkGoogleStatus]);

  const handleConnectGoogle = () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      alert('Chat session not found. Please open the consultation chat first, then return here.');
      return;
    }
    setCheckingAuth(true);
    window.location.href = `${CHAT_WONDER_API}/auth/google?session_id=${sessionId}&return_path=/settings`;
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0a0e17' }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ borderColor: 'rgba(139, 69, 100, 0.2)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: COLORS.PRIMARY }} />
          <h1 className="text-white font-semibold text-lg">Profile Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Success Banner */}
        {successBanner && (
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderColor: 'rgba(34, 197, 94, 0.3)',
            }}
          >
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-semibold text-sm">Google Account Connected!</p>
              <p className="text-green-400/70 text-xs mt-0.5">
                Your Google Calendar and Gmail are now linked.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div
          className="rounded-2xl border p-6 flex flex-col gap-6"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(139, 69, 100, 0.25)',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-xl font-semibold">{displayName}</h2>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Mail size={13} />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div
            className="rounded-xl p-4 grid grid-cols-1 gap-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center gap-3">
              <User size={15} style={{ color: COLORS.PRIMARY }} />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Display Name</span>
                <span className="text-sm text-white">{displayName}</span>
              </div>
            </div>
            <div
              className="h-px"
              style={{ backgroundColor: 'rgba(139,69,100,0.15)' }}
            />
            <div className="flex items-center gap-3">
              <Mail size={15} style={{ color: COLORS.PRIMARY }} />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Email Address</span>
                <span className="text-sm text-white">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div
          className="rounded-2xl border p-6 flex flex-col gap-5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(139, 69, 100, 0.25)',
          }}
        >
          <div>
            <h3 className="text-white font-semibold text-base">Connected Accounts</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Link external services to let the AI assistant access your calendar and emails.
            </p>
          </div>

          {/* Google Integration Row */}
          <div
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{
              borderColor: 'rgba(139,69,100,0.2)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex items-center gap-4">
              {/* Google G icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)' }}
              >
                G
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Google Calendar &amp; Gmail</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {googleStatus === 'loading' ? (
                    <Loader2 size={12} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  ) : googleStatus === 'connected' ? (
                    <CheckCircle2 size={12} className="text-green-400" />
                  ) : (
                    <AlertCircle size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  )}
                  <span
                    className="text-xs"
                    style={{
                      color: googleStatus === 'connected'
                        ? 'rgba(74, 222, 128, 0.85)'
                        : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {googleStatus === 'loading'
                      ? 'Checking...'
                      : googleStatus === 'connected'
                      ? 'Connected'
                      : 'Not connected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            {googleStatus === 'loading' ? (
              <div className="w-24 h-9 rounded-xl bg-white/5 animate-pulse" />
            ) : googleStatus === 'connected' ? (
              <div
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'rgba(74,222,128,0.9)' }}
              >
                <CheckCircle2 size={13} />
                Connected
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={checkingAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT_DARK})`,
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                }
              >
                {checkingAuth ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Calendar size={13} />
                )}
                {checkingAuth ? 'Redirecting...' : 'Connect Google'}
              </button>
            )}
          </div>

          {/* Explainer */}
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Connecting Google grants the AI assistant read access to your Gmail and full
            access to your Google Calendar so it can book consultations and check schedules
            on your behalf. You can revoke access at any time from your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: COLORS.PRIMARY }}
            >
              Google Account settings
            </a>
            .
          </p>
        </div>

      </div>
    </div>
  );
}
