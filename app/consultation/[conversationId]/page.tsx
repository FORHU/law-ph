'use client'

import { useAuth } from "@/components/auth-provider";
import ConsultationScreen from "@/components/consultation-screen";
import { useConversations } from "@/components/conversation-provider";
import { useParams, useRouter } from "next/navigation";

export default function Page() {

  const router = useRouter()
  const { conversations} = useConversations()
  const { loggedIn, session } = useAuth()
  const { conversationId } = useParams() as { conversationId: string}

  const navigateToHome = () => {
    router.push('/')
  }

  return (
          <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} activeConversationId={conversationId} conversations={conversations} session={session} />
  );
}
