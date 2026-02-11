// components/auth-provider.tsx
'use client';
import { createClient } from '@/lib/supabase/client';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';

type AuthContextType = { 
  loggedIn: boolean; 
  session: Session | null;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({
  initialSession,
  children,
}: {
  initialSession: Session | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(initialSession);
  const supabase = useMemo(() => createClient(), []);

  const loggedIn = !!session;
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ loggedIn, session, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
