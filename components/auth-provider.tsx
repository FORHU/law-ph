// components/auth-provider.tsx
'use client';
import { createClient } from '@/lib/supabase/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

type AuthContextType = { loggedIn: boolean; session: Session | null };

const AuthContext = createContext<AuthContextType>({ loggedIn: false, session: null });

export default function AuthProvider({
  initialSession,
  children,
}: {
  initialSession: Session | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(initialSession);

  const loggedIn = !!session;
  
  useEffect(() => {
    const supabase = createClient();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => (subscription as any)?.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ loggedIn, session }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
