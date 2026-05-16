'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CaseInvitePage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params?.id as string;
  const { loggedIn } = useAuth();
  const { refreshCases } = useConversations();

  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    if (!loggedIn) {
      router.push(`/auth/login?redirect=/case-invite/${inviteId}`);
      return;
    }

    if (!inviteId) {
      setStatus('error');
      setErrorDetails('Invalid invite link.');
      return;
    }

    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, inviteId]);

  const handleJoin = async () => {
    setStatus('joining');
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to join');

      setStatus('success');
      if (refreshCases) await refreshCases();
      setTimeout(() => {
        router.push(`/cases/${json.conversationId}`);
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorDetails(err.message || 'An unexpected error occurred.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0B0C] gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#e9c176]" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Ratifying Institutional Invitation...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0B0C] px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#111111] border border-[#722f37]/30 rounded-[2.5rem] p-12 shadow-2xl text-center relative overflow-hidden"
      >
        {status === 'joining' && (
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-[#e9c176]" />
            <h2 className="text-2xl font-serif text-white tracking-tight">Authenticating <span className="text-[#e9c176] italic">Credentials</span></h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Securing your position within the institutional record</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mb-2 border border-green-500/20">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-serif text-white tracking-tight">Access <span className="text-green-500 italic">Ratified</span></h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Transitioning to relevant case evidence...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-2 border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-serif text-white tracking-tight">Protocol <span className="text-red-500 italic">Failure</span></h2>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">{errorDetails}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-10 py-4 bg-[#722f37] hover:bg-[#8b3a44] text-white rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#722f37]/20 active:scale-95"
            >
              Return to Repository
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
