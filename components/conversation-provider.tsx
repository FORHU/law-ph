import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react"
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
  currentConsultationId: string | number | null,
  chatSessionId: string,
  
  // Handlers
  handleSendMessage: (text: string) => Promise<void>,
  handleLoadConsultation: (consultation: ConsultationSession) => void,
  handleNewConsultation: () => void,
  handleRemoveConsultation: (id: string | number) => void,
  handleDeleteMessage: (messageId: string | number) => Promise<void>
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { loggedIn, session, supabase } = useAuth()
  const { conversationId: syncedConversationId } = useParams() as { conversationId?: string }
  const userId = session?.user?.id

  // Local/UI state
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConsultationId, setCurrentConsultationId] = useState<string | number | null>(null)
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([])
  const [chatSessionId, setChatSessionId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Supabase state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loaded, setLoaded] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Ref to track all IDs deleted during this session to prevent any "resurrection" from stale API data
  const deletedIdsRef = useRef<Set<string>>(new Set())

  // Load shadow-deleted IDs from local storage on mount
  useEffect(() => {
    const savedIds = localStorage.getItem("deleted_conversation_ids")
    if (savedIds) {
      try {
        const parsed = JSON.parse(savedIds)
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => deletedIdsRef.current.add(id))
        }
      } catch (e) {
        console.error("Failed to parse deleted IDs", e)
      }
    }
  }, [])

  const persistDeletedId = (id: string) => {
    deletedIdsRef.current.add(id)
    localStorage.setItem("deleted_conversation_ids", JSON.stringify(Array.from(deletedIdsRef.current)))
  }

  const handleRemoveConsultation = async (id: string | number) => {
    console.log("[ConversationProvider] Removing consultation:", id);
    const idStr = id.toString();
    
    // 1. Optimistic UI update
    setRecentConsultations(prev => prev.filter(c => c.id.toString() !== idStr))
    setConversations(prev => prev.filter(c => c.id.toString() !== idStr))
    
    // 2. Persist to Shadow Realm immediately
    persistDeletedId(idStr)

    // If it's the active one, clear state immediately
    if (currentConsultationId?.toString() === idStr) {
      handleNewConsultation()
    }

    // 3. Cloud removal (Best Effort)
    if (typeof id === 'string') {
      try {
        console.log(`[ConversationProvider] Shadow Delete Active. ID: "${id}"`);
        
        const { error, status } = await supabase
          .from("conversations")
          .delete()
          .eq("id", id);
        
        if (error || (status !== 200 && status !== 204)) {
          console.warn("[ConversationProvider] DB Delete failed (RLS Block). Item Shadow-Deleted locally.", status, error?.message);
        } else {
          console.log("[ConversationProvider] DB deletion confirmed.");
        }

        // Always sync, but the filter in fetchConversations will hide it thanks to deletedIdsRef
        await fetchConversations();
      } catch (err) {
        console.error("[ConversationProvider] Critical delete error:", err);
        // Do NOT restore state. Keep it deleted.
      }
    }
  }

  const handleDeleteMessage = async (messageId: string | number) => {
    // 1. Optimistic UI update
    setMessages(messages.filter(m => m.id !== messageId))

    // 2. Cloud removal (Best Effort)
    if (typeof messageId === 'string' || typeof messageId === 'number') {
      try {
        const { error } = await supabase.from("messages").delete().eq("id", messageId)
        if (error) {
          console.error("Failed to delete message (likely RLS). Item hidden locally.", error.message)
          // Shadow Delete: We do NOT restore it. We assume the user wants it gone.
        }
      } catch (err) {
        console.error("Unexpected error during message deletion:", err)
        // Do NOT restore.
      }
    }
  }

  // Helper to map Supabase/Cloud messages to UI format
  const mapCloudMessage = useCallback((msg: any): Message => ({
    ...msg,
    text: msg.text || msg.content || "",
    sender: msg.sender || (msg.role === 'assistant' ? 'ai' : 'user'),
    time: msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : "")
  }), [])

  // Background Cleanup: Retry deleting "shadow-deleted" items
  useEffect(() => {
    const retryDeletions = async () => {
        if (!userId || deletedIdsRef.current.size === 0) return;

        const idsToRetry = Array.from(deletedIdsRef.current);
        console.log("[ConversationProvider] Retrying deletion for shadow items:", idsToRetry);

        for (const id of idsToRetry) {
          const { error, status } = await supabase.from("conversations").delete().eq("id", id);
          
          // Better Check:
          const { data: check } = await supabase.from("conversations").select("id").eq("id", id).maybeSingle();
          if (!check) {
            console.log("[ConversationProvider] Item confirmed gone from DB. Removing from shadow list:", id);
            deletedIdsRef.current.delete(id);
            localStorage.setItem("deleted_conversation_ids", JSON.stringify(Array.from(deletedIdsRef.current)));
          } else {
            console.log("[ConversationProvider] Item still exists in DB (RLS Block). Keeping in shadow list:", id);
            // We try to delete again just in case rights were fixed
            await supabase.from("conversations").delete().eq("id", id);
          }
        }
    }
    
    retryDeletions();
  }, [userId])

  // Initialize and Sync
  useEffect(() => {
    if (!userId) {
      setRecentConsultations([])
      setMessages([])
      setCurrentConsultationId(null)
      return
    }

<<<<<<< HEAD
    // Fetch Chat Session ID
=======
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

    // Fetch Chat Session ID (or retrieve from localStorage)
>>>>>>> e04d1a57b66a6b70d458ed804532388949eef533
    const fetchSession = async () => {
      try {
        // Check if we already have a session ID in localStorage
        const storedSessionId = localStorage.getItem('chat_session_id');
        if (storedSessionId) {
          console.log("[Session] Using cached session ID:", storedSessionId);
          setChatSessionId(storedSessionId);
          return;
        }

        // If not, fetch a new one from the backend
        const res = await fetch('/api/chat/session')
        if (res.ok) {
          const data = await res.json()
          const newSessionId = data.session_id;
          setChatSessionId(newSessionId);
          // Store it for future use
          localStorage.setItem('chat_session_id', newSessionId);
          console.log("[Session] New session ID created:", newSessionId);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err)
      }
    }
    fetchSession()
  }, [userId, syncedConversationId])


  // Fetch Cloud Messages if needed
  useEffect(() => {
    let ignore = false;

    const fetchCloudMessages = async () => {
      // If we're on the root /consultation route (no ID), clear state and bail
      if (!syncedConversationId) {
        if (currentConsultationId !== null || messages.length > 0) {
          console.log("No synced ID, clearing state");
          handleNewConsultation();
        }
        return;
      }

      if (!userId || !loggedIn) return;
      
      // If we haven't loaded conversations yet, wait.
      // We NEED the list to verify existence and avoid "resurrecting" deleted items.
      if (!loaded) return;

      // Check existence
      const exists = conversations.some(c => c.id.toString() === syncedConversationId);
      if (!exists) {
        console.log("Conversation not found in list, clearing state. ID:", syncedConversationId);
        handleNewConsultation();
        return;
      }

      // Avoid redundant fetches if we already have the right data
      if (currentConsultationId?.toString() === syncedConversationId && messages.length > 0) return;

      console.log("Fetching messages for:", syncedConversationId);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", syncedConversationId)
        .order("created_at", { ascending: true })

      if (ignore) return;

      if (!error && data) {
        setMessages(data.map(mapCloudMessage))
        setCurrentConsultationId(syncedConversationId)
      } else if (error) {
        console.error("Error fetching messages:", error)
      }
    }

    fetchCloudMessages();
    return () => { ignore = true; };
  }, [syncedConversationId, userId, loggedIn, mapCloudMessage, supabase, loaded, conversations])

  // Sync Supabase Conversations
  const fetchConversations = useCallback(async () => {
    if (!loggedIn || !userId) return
    console.log("[ConversationProvider] fetchConversations starting for user:", userId);

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[ConversationProvider] fetchConversations error:", error.message);
        return;
      }

      if (data) {
        // Double-check: Filter out ANY ID that was deleted in this session
        const liveData = data.filter(c => !deletedIdsRef.current.has(c.id.toString()));
        console.log("[ConversationProvider] Sync complete. Filtered items:", data.length - liveData.length);
        
        setConversations(liveData)
        // Map basic conversation list to ConsultationSession format for UI compatibility
        const mappedSessions: ConsultationSession[] = liveData.map(conv => ({
          id: conv.id,
          title: conv.title,
          subtitle: `Cloud Session`,
          messages: [] // Messages are fetched on demand
        }))
        setRecentConsultations(mappedSessions)
        setLoaded(true)
      }
    } catch (err) {
      console.error("[ConversationProvider] Unexpected error in fetchConversations:", err);
    } finally {
      console.log("[ConversationProvider] fetchConversations complete.");
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setMessages([])
    setCurrentConsultationId(null)
    setIsLoading(false)
  }


  // Functions have been hoisted to the top near state definitions to support the Shadow Delete logic.
  // This block is intentionally left empty to remove the old implementations.

  const handleSendMessage = async (text: string) => {
    if (text.trim() && !isLoading) {
      const currentInput = text.trim()
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const newMessage = {
        id: Date.now(),
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
      
      let sessionId = currentConsultationId

      // 1. Create conversation if it doesn't exist
      if (!sessionId || typeof sessionId === 'number') {
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: currentInput.substring(0, 50)
          })
          .select()
          .single()

        if (convError) {
          console.error("Failed to create conversation:", convError)
          return
        }
        
        sessionId = convData.id
        setCurrentConsultationId(sessionId)
        await fetchConversations() // Refresh sidebar
      }

      // 2. Save user message to cloud
      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: sessionId,
          role: 'user',
          content: currentInput
        })
        .select()
        .single()

      if (!userMsgError && savedUserMsg) {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? mapCloudMessage(savedUserMsg) : m))
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

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        const controller = new AbortController()
        abortControllerRef.current = controller

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_input: `[Legal AI] ${currentInput}`,
            session_id: chatSessionId || `session_${Date.now()}`,
          }),
          signal: controller.signal
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
          setMessages(finalMessages)

          // 3. Save AI message to cloud
          const { data: savedAiMsg, error: aiMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: sessionId,
              role: 'assistant',
              content: accumulatedText
            })
            .select()
            .single()

          if (!aiMsgError && savedAiMsg) {
            setMessages(prev => {
              const updated = [...prev]
              const lastIdx = updated.length - 1
              if (updated[lastIdx]?.sender === CHAT_SENDER.AI) {
                updated[lastIdx] = mapCloudMessage(savedAiMsg)
              }
              return updated
            })
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return
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
        if (abortControllerRef.current?.signal.aborted) {
          abortControllerRef.current = null
        }
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
        handleRemoveConsultation,
        handleDeleteMessage
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
