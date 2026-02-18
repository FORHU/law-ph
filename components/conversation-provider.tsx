'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Conversation, ConsultationSession } from "@/types"
import { useAuth } from "@/components/auth/auth-provider"
import { useParams } from "next/navigation"
import { CHAT_SENDER, STORAGE_KEYS } from "@/lib/constants"
import { extractLegalSources, extractRelatedCases } from '@/lib/citation-parser'
import { 
  ConversationContext, 
  Message,
  type ConversationContextType 
} from './conversation-provider/conversation-context'
import { useDetailSidebar } from './conversation-provider/use-detail-sidebar'
import { useSendMessage } from './conversation-provider/use-send-message'
import { useChatSession } from './conversation-provider/use-chat-session'


export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { loggedIn, session, supabase } = useAuth()
  const { conversationId: syncedConversationId } = useParams() as { conversationId?: string }
  const userId = session?.user?.id

  // Local/UI state
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConsultationId, setCurrentConsultationId] = useState<string | number | null>(null)
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Detail sidebar hook
  const {
    isDetailSidebarOpen,
    selectedSource,
    selectedCase,
    detailContext,
    openSourceDetail,
    openCaseDetail,
    closeDetailSidebar,
  } = useDetailSidebar(setIsSidebarOpen);

  // Chat session hook
  const { chatSessionId, setChatSessionId } = useChatSession();

  
  // Supabase state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loaded, setLoaded] = useState(false)

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
        
        // Sync local storage whenever we get fresh data from cloud to avoid revert loops
        localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(mappedSessions))
        
        setLoaded(true)
      }
    } catch (err) {
      console.error("[ConversationProvider] Unexpected error in fetchConversations:", err);
    } finally {
      console.log("[ConversationProvider] fetchConversations complete.");
    }
  }, [loggedIn, userId, supabase])

  // Message sending hook
  const { handleSendMessage, abortMessage, abortControllerRef } = useSendMessage({
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    currentConsultationId,
    setCurrentConsultationId,
    chatSessionId,
    setChatSessionId,
    userId,
    fetchConversations,
    mapCloudMessage,
    supabase
  });

  // Background Cleanup: Retry deleting "shadow-deleted" items
  const hasRetriedDeletions = useRef(false);

  useEffect(() => {
    const retryDeletions = async () => {
        if (!userId || deletedIdsRef.current.size === 0 || hasRetriedDeletions.current) return;
        
        hasRetriedDeletions.current = true; // Mark as run for this session
        
        const idsToRetry = Array.from(deletedIdsRef.current);
        console.log("[ConversationProvider] Retrying deletion for shadow items (One-time check):", idsToRetry.length);

        for (const id of idsToRetry) {
          // Check if it still exists
          const { data: check, error: checkError } = await supabase.from("conversations").select("id").eq("id", id).maybeSingle();
          
          if (!check) {
            console.log("[ConversationProvider] Item confirmed gone from DB. Removing from shadow list:", id);
            deletedIdsRef.current.delete(id);
          } else {
             // Try to delete ONE last time for this session
             const { error, status } = await supabase.from("conversations").delete().eq("id", id);
             
             if (error || (status !== 200 && status !== 204)) {
                console.warn(`[ConversationProvider] Failed to delete item ${id}. Stopping retries for this session to avoid spam. Status: ${status}`);
                // We keep it in the list (so it stays hidden in UI) but we won't try again until page reload.
             } else {
                console.log("[ConversationProvider] Successfully deleted item on retry:", id);
                deletedIdsRef.current.delete(id);
             }
          }
        }
        
        // Update local storage with remaining items (those that failed or haven't been processed yet)
        localStorage.setItem("deleted_conversation_ids", JSON.stringify(Array.from(deletedIdsRef.current)));
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

    // Load from Local Storage
    const storageKey = STORAGE_KEYS.CONSULTATIONS
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
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse consultations', e)
      }
    }
  }, [userId, syncedConversationId])



  // Fetch Cloud Messages if needed
  useEffect(() => {
    let ignore = false;

    const fetchCloudMessages = async () => {
      // If we're on the root /consultation route (no ID), clear state and bail
      if (!syncedConversationId) {
        // GUARD: Don't clear if we're currently loading/streaming or if we just started a session
        if (isLoading) return;

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

  const handleRenameConsultation = async (id: string | number, newTitle: string) => {
    const idStr = id.toString();
    console.log(`[ConversationProvider] handleRenameConsultation: "${idStr}" -> "${newTitle}"`);
    
    // 1. Optimistic Update (UI responsiveness)
    setRecentConsultations(prev => {
      const updated = prev.map(c => c.id.toString() === idStr ? { ...c, title: newTitle } : c);
      localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(updated));
      return updated;
    });

    // 2. Atomic DB Update
    if (loggedIn) {
      try {
        console.log(`[ConversationProvider] Cloud Syncing rename: ${idStr}`);
        const { data, error } = await supabase
          .from("conversations")
          .update({ title: newTitle })
          .eq("id", idStr)
          .select();
        
        if (error) {
          console.error("[ConversationProvider] DB Rename failed:", error.message);
        } else if (data && data.length === 0) {
          console.warn("[ConversationProvider] DB Update returned 0 rows. RLS likely blocking update for ID:", idStr);
        } else {
          console.log("[ConversationProvider] DB Rename successful. Updated rows:", data?.length);
        }
      } catch (err) {
        console.error("[ConversationProvider] Critical rename error:", err);
      }
    }
  }

  const handleNewConsultation = () => {
    abortMessage()
    setMessages([])
    setCurrentConsultationId(null)
    setIsLoading(false)
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
        handleRenameConsultation,
        handleDeleteMessage,
        isSidebarOpen,
        setIsSidebarOpen,
        isDetailSidebarOpen,
        selectedSource,
        selectedCase,
        detailContext,
        openSourceDetail,
        openCaseDetail,
        closeDetailSidebar,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

