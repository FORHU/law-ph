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


  useEffect( () => {
    const fetchConversations = async () => {
    if(loggedIn){
      const userId = session?.user?.id
      const { data : lastConversation } =  await supabase.from("conversations").select("*").eq("user_id", userId ).order("created_at", { ascending: false}).limit(1).maybeSingle()

      // create new conversation if no conversation yet
      if(lastConversation){
        const id = lastConversation?.id
        router.push(`/consultation/${id}`)
      } 
    }

    }
    fetchConversations()
  }, [])


  const navigateToHome = () => {
    router.push('/')
  }

  return (
        <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} session={session} />
  );
}
