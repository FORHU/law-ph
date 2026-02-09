import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Conversation, Message, ConsultationSession } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { useParams } from "next/navigation"
import { CHAT_SENDER, STORAGE_KEYS } from "@/lib/constants"

type ConversationContextType = {
  // Supabase/Cloud state
  conversations: Conversation[],
  refreshConversations: () => Promise<void>,
  
  // Local/Consultation state (hoisted from useConsultation)
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  isLoading: boolean,
  recentConsultations: ConsultationSession[],
  currentConsultationId: number | null,
  chatSessionId: string,
  
  // Handlers
  handleSendMessage: (text: string) => Promise<void>,
  handleLoadConsultation: (consultation: ConsultationSession) => void,
  handleNewConsultation: () => void,
  handleRemoveConsultation: (id: number) => void
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { loggedIn, session } = useAuth()
  const { conversationId: syncedConversationId } = useParams() as { conversationId?: string }
  const userId = session?.user?.id

  // Local/UI state
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(null)
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([])
  const [chatSessionId, setChatSessionId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Supabase state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loaded, setLoaded] = useState(false)

  const storageKey = userId ? `${STORAGE_KEYS.CONSULTATIONS}_${userId}` : STORAGE_KEYS.CONSULTATIONS

  // Helper to map Supabase/Cloud messages to UI format
  const mapCloudMessage = useCallback((msg: any): Message => ({
    ...msg,
    text: msg.text || msg.content || "",
    sender: msg.sender || (msg.role === 'assistant' ? 'ai' : 'user'),
    time: msg.time || (msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
           msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : "")
  }), [])

  // Initialize and Sync
  useEffect(() => {
    if (!userId) {
      setRecentConsultations([])
      setMessages([])
      setCurrentConsultationId(null)
      return
    }

    // Load from Local Storage
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setRecentConsultations(parsed)
        
        if (syncedConversationId) {
          // GUARD: Skip reload if we are already in sync.
          if (currentConsultationId?.toString() === syncedConversationId) {
            // State is already correct
          } else {
            const synced = parsed.find((c: ConsultationSession) => c.id.toString() === syncedConversationId)
            if (synced) {
              setMessages(synced.messages)
              setCurrentConsultationId(synced.id)
            } else {
              // Not in recent consultations, maybe it's in Supabase?
              // The fetchMessages effect below will handle that.
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse consultations', e)
      }
    }

    // Fetch Chat Session ID
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/chat/session')
        if (res.ok) {
          const data = await res.json()
          setChatSessionId(data.session_id)
        }
      } catch (err) {
        console.error("Failed to initialize session:", err)
      }
    }
    fetchSession()
  }, [userId, syncedConversationId, storageKey]) // Intentionally omit currentConsultationId to avoid HMR loops

  // Fetch Cloud Messages if needed
  useEffect(() => {
    if (!syncedConversationId || !userId || !loggedIn) return
    
    // Check if we already have it in local state
    if (currentConsultationId?.toString() === syncedConversationId && messages.length > 0) return

    const fetchCloudMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", syncedConversationId)
        .order("timestamp", { ascending: true })

      if (!error && data) {
        setMessages(data.map(mapCloudMessage))
        setCurrentConsultationId(parseInt(syncedConversationId) || null)
      }
    }

    fetchCloudMessages()
  }, [syncedConversationId, userId, loggedIn, mapCloudMessage, supabase, currentConsultationId, messages.length])

  // Save to Local Storage
  useEffect(() => {
    if (userId && (recentConsultations.length > 0 || currentConsultationId)) {
      localStorage.setItem(storageKey, JSON.stringify(recentConsultations))
    }
  }, [recentConsultations, userId, storageKey])

  // Sync Supabase Conversations
  const fetchConversations = useCallback(async () => {
    if (!loggedIn || !userId) return

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setConversations(data)
      setLoaded(true)
    }
  }, [loggedIn, userId, supabase])

  useEffect(() => {
    if (!loaded && loggedIn) {
      fetchConversations()
    }
  }, [loggedIn, loaded, fetchConversations])

  // Handlers
  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(consultation.messages)
    setCurrentConsultationId(consultation.id)
  }

  const handleNewConsultation = () => {
    setMessages([])
    setCurrentConsultationId(null)
  }

  const handleRemoveConsultation = (id: number) => {
    const updated = recentConsultations.filter(c => c.id !== id)
    setRecentConsultations(updated)
    if (currentConsultationId === id) {
      handleNewConsultation()
    }
  }

  const handleSendMessage = async (text: string) => {
    if (text.trim() && !isLoading) {
      const currentInput = text.trim()
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const newMessage = {
        id: Date.now(),
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: timestamp
      }
      
      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      
      const sessionTitle = currentConsultationId 
        ? recentConsultations.find(c => c.id === currentConsultationId)?.title || currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '')
        : currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '')

      const sessionId = currentConsultationId || Date.now()
      
      const sessionData: ConsultationSession = {
        id: sessionId,
        title: sessionTitle,
        subtitle: `Session_${sessionId.toString().slice(-5)}...`,
        messages: updatedMessages
      }

      if (!currentConsultationId) {
        setCurrentConsultationId(sessionId)
        setRecentConsultations([sessionData, ...recentConsultations])
      } else {
        setRecentConsultations(recentConsultations.map(c => c.id === sessionId ? sessionData : c))
      }

      setIsLoading(true)
      
      try {
        const aiMessageId = Date.now() + 1
        const initialAiMessage = {
          id: aiMessageId,
          text: "",
          sender: CHAT_SENDER.AI,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }

        setMessages(prev => [...prev, initialAiMessage])

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_input: `[Legal AI] ${currentInput}`,
            session_id: chatSessionId || `session_${Date.now()}`,
          }),
        })

        if (!response.ok) throw new Error("Failed to connect to AI")

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedText = ""

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            let chunk = decoder.decode(value, { stream: true })
            if (chunk.includes("__END__")) {
              chunk = chunk.replace("__END__", "")
            }
            
            if (chunk.startsWith("[Error]")) {
              accumulatedText = "Error: " + chunk.replace("[Error]", "")
              break
            }

            if (chunk.startsWith("[Tool]")) continue

            accumulatedText += chunk

            setMessages(prev => {
              const updated = [...prev]
              const lastIdx = updated.length - 1
              if (updated[lastIdx]?.id === aiMessageId) {
                updated[lastIdx] = { ...updated[lastIdx], text: accumulatedText }
              }
              return updated
            })
          }

          const finalMessages = [...updatedMessages, { ...initialAiMessage, text: accumulatedText }]
          const finalSessionData = { ...sessionData, messages: finalMessages }
          setRecentConsultations(prev => prev.map(c => c.id === sessionId ? finalSessionData : c))
        }
      } catch (error) {
        console.error("AI Stream Error:", error)
        setMessages(prev => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]) {
            updated[lastIdx] = { ...updated[lastIdx], text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }
          }
          return updated
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        refreshConversations: fetchConversations,
        messages,
        setMessages,
        isLoading,
        recentConsultations,
        currentConsultationId,
        chatSessionId,
        handleSendMessage,
        handleLoadConsultation,
        handleNewConsultation,
        handleRemoveConsultation
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
