'use client'

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Conversation, Message } from "@/types"
import { useAuth } from "@/components/auth-provider"

type ConversationContextType = {
  conversations: Conversation[],
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  refreshConversations: () => Promise<void>
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { loggedIn, session } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [ messages , setMessages ] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Kumusta! I am your LexPH workspace. You can ask me legal questions, find nearby legal aid, or upload a document for me to review.",
      timestamp: new Date()
    }
  ])
  const [loaded, setLoaded] = useState(false)

  const fetchConversations = async () => {
    if (!loggedIn || !session?.user) return

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setConversations(data)
      setLoaded(true)
    }
  }

  useEffect(() => {
    if (!loaded) {
      fetchConversations()
    }
  }, [loggedIn])

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        messages,
        setMessages,
        refreshConversations: fetchConversations
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export const useConversations = () => {
  const ctx = useContext(ConversationContext)
  if (!ctx) throw new Error("useConversations must be used inside ConversationProvider")
  return ctx
}
