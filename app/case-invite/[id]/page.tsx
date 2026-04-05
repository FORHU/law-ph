'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CaseInvitePage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params?.id as string;
  const { loggedIn, session, supabase } = useAuth();
  const { refreshCases } = useConversations();
  
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {

    if (!loggedIn || !session?.user?.id) {
      // Not logged in, redirect to login with a redirect param
      router.push(`/auth/login?redirect=/case-invite/${inviteId}`);
      return;
    }

    if (!inviteId) {
      setStatus('error');
      setErrorDetails('Invalid invite link.');
      return;
    }

    handleJoin();
  }, [loggedIn, session, inviteId, router]);

  const handleJoin = async () => {
    if (!supabase || !session?.user?.id) return;
    setStatus('joining');

    try {
      // Fetch invite info
      const { data: invite, error: fetchError } = await supabase
        .from('conversation_invites')
        .select('conversation_id')
        .eq('id', inviteId)
        .single();

      if (fetchError || !invite) {
        throw new Error('This invite link is invalid or has expired.');
      }

      // Automatically join by inserting into conversation_participants
      // If already joined, this will throw a unique constraint error which is fine, we just redirect.
      const { error: joinError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: invite.conversation_id,
          user_id: session.user.id,
        });

      if (joinError && joinError.code !== '23505') {
        // 23505 is unique violation (already joined)
        throw new Error('Failed to join the case. Please try again later.');
      }

      // If they just joined successfully (no violation), inject a system message
      if (!joinError) {
        const displayName = session.user.user_metadata?.full_name || session.user.email || 'A user';
        await supabase.from('messages').insert({
          conversation_id: invite.conversation_id,
          role: 'system',
          content: `${displayName} joined the case.`
        });
      }

      setStatus('success');
      
      // Forcefully refresh the synced cases before jumping, preventing 'New Consultation' title flash
      if (refreshCases) {
        await refreshCases();
      }
      
      // We wait a brief moment for the user to see success, then redirect
      setTimeout(() => {
        router.push(`/cases/${invite.conversation_id}`);
      }, 1500);

    } catch (err: any) {
      setStatus('error');
      setErrorDetails(err.message || 'An unexpected error occurred.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1A] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#E0A7C2]" />
        <p className="text-gray-400 font-medium">Verifying invite...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1A] px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#252525] border border-white/10 rounded-2xl p-8 shadow-2xl text-center"
      >
        {status === 'joining' && (
          <div className="flex flex-col items-center gap-4">
             <Loader2 className="w-12 h-12 animate-spin text-[#E0A7C2]" />
             <h2 className="text-xl font-bold text-white">Joining Case...</h2>
             <p className="text-sm text-gray-400">Please wait while we add you to the conversation.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mb-2">
               <CheckCircle className="w-8 h-8 text-[#10B981]" />
             </div>
             <h2 className="text-2xl font-bold text-white">Successfully Joined!</h2>
             <p className="text-sm text-gray-400">Redirecting you to the case...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
               <AlertCircle className="w-8 h-8 text-red-500" />
             </div>
             <h2 className="text-2xl font-bold text-white">Cannot Join Case</h2>
             <p className="text-sm text-red-400">{errorDetails}</p>
             <button
               onClick={() => router.push('/')}
               className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
             >
               Go back strictly
             </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
