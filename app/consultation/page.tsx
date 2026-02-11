'use client'
import { useAuth } from "@/components/auth-provider";
import ConsultationScreen from "@/components/consultation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { loggedIn, session } = useAuth()
   const supabase = createClient()
   const router = useRouter()


  // Removed auto-redirect to latest conversation to allow "New Consultation" flow 
  // to correctly land on the base /consultation route.


  const navigateToHome = () => {
    router.push('/')
  }

  return (
        <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} session={session} />
  );
}
