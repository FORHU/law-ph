'use client'

import { useAuth } from "@/components/auth-provider";
import ConsultationScreen from "@/components/consultation-screen";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {

  const { loggedIn } = useAuth()
  const { conversationId } = useParams() as { conversationId: string}
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    console.log('conversationId', conversationId)
  }, [])

  const router = useRouter()

  const navigateToHome = () => {
    router.push('/')
  }

  return (
        <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} activeConversationId={conversationId} conversations={[]} />
  );
}
