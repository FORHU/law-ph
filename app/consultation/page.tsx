'use client'
import { useAuth } from "@/components/auth-provider";
import ConsultationScreen from "@/components/consultation-screen";
import { createClient } from "@/lib/supabase/client";
import { Conversation } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { loggedIn, session } = useAuth()
   const supabase = createClient()
   const router = useRouter()

   const handleSubmitPrompt = async (input: string) => {
    if(!loggedIn) return;

    const { data: newConversation, error } = await supabase.from("conversations").insert( { title: input?.slice(0,32) || "New Consultation", user_id: session?.user?.id }).select().single()

    if(error){
      console.error("[Create New Conversation error]", error?.message)
      return;
    }

    if(newConversation as Conversation){
      const id = newConversation?.id
      if(!id) return;
      router.push(`/consultation/${id}`)
    }
   }

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
        <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} onSubmitPrompt={handleSubmitPrompt} />
  );
}
