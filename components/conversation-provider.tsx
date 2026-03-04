'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Conversation, ConsultationSession, CaseData } from "@/types"
import { useAuth } from "@/components/auth/auth-provider"
import { useParams } from "next/navigation"
import { CHAT_SENDER, STORAGE_KEYS } from "@/lib/constants"
import { extractLegalSources, extractRelatedCases, extractTimeline } from '@/lib/citation-parser'
import { 
  ConversationContext, 
  Message,
  type ConversationContextType 
} from './conversation-provider/conversation-context'
import { useDetailSidebar } from './conversation-provider/use-detail-sidebar'
import { useSendMessage } from './conversation-provider/use-send-message'
import { useChatSession } from './conversation-provider/use-chat-session'


export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { loggedIn, session, supabase } = useAuth();
  const params = useParams();
  const syncedConversationId = (params?.conversationId || params?.id) as string | undefined;
  const userId = session?.user?.id

  // Local/UI state
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConsultationId, setCurrentConsultationId] = useState<string | number | null>(null)
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const updateMessage = useCallback(async (id: string | number, updates: Partial<Message> & { __appendVoiceNote?: { id: string; url: string } }) => {
    // 1. Update state immediately for UI responsiveness
    setMessages((prev) => 
      prev.map((msg) => {
        if (msg.id.toString() !== id.toString()) return msg;
        // Handle special __appendVoiceNote: append to voiceNotes array
        if (updates.__appendVoiceNote) {
          const currentNotes = msg.voiceNotes || (msg.recordingUrl ? [{ id: 'legacy', url: msg.recordingUrl }] : []);
          const newNotes = [...currentNotes, updates.__appendVoiceNote];
          return { ...msg, voiceNotes: newNotes, recordingUrl: newNotes[0]?.url };
        }
        return { ...msg, ...updates };
      })
    );

    // 2. Perform DB update if logged in and ID is a valid UUID
    if (loggedIn) {
      const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) return; // Skip DB update for temporary numeric IDs

      try {
        const currentMessages = messages; 
        const targetMsg = currentMessages.find(m => m.id.toString() === id.toString());
        
        if (targetMsg) {
          // Compute what the merged message looks like
          let mergedMsg: any;
          if (updates.__appendVoiceNote) {
            const currentNotes = targetMsg.voiceNotes || (targetMsg.recordingUrl ? [{ id: 'legacy', url: targetMsg.recordingUrl }] : []);
            const newNotes = [...currentNotes, updates.__appendVoiceNote];
            mergedMsg = { ...targetMsg, voiceNotes: newNotes, recordingUrl: newNotes[0]?.url };
          } else {
            mergedMsg = { ...targetMsg, ...updates };
          }

          const meta = {
            originalText: mergedMsg.originalText,
            editedAt: mergedMsg.editedAt,
            editedBy: mergedMsg.editedBy,
            recordingUrl: mergedMsg.recordingUrl,
            voiceNotes: mergedMsg.voiceNotes,
            highlights: mergedMsg.highlights
          };
          
          let newContent = mergedMsg.text;
          if (Object.values(meta).some(v => v !== undefined)) {
            newContent += `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;
          }

          const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', id);
          if (error) console.error("[ConversationProvider] DB Update message failed:", error.message);
        }
      } catch (err) {
        console.error("[ConversationProvider] DB Update message critical error:", err);
      }
    }
  }, [loggedIn, supabase, messages])

  
  // Cases state
  const [cases, setCases] = useState<CaseData[]>([])
  
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

    // If it's the active one, clear state immediately
    if (currentConsultationId?.toString() === idStr) {
      handleNewConsultation()
    }

    // 2. Cloud removal
    try {
      const { error, status } = await supabase
        .from("conversations")
        .delete()
        .eq("id", idStr);
      
      if (error || (status !== 200 && status !== 204)) {
        // Only shadow-delete if the DB delete actually failed
        console.warn("[ConversationProvider] DB Delete failed. Shadow-deleting locally.", status, error?.message);
        persistDeletedId(idStr);
      } else {
        // Success: ensure it's NOT in the shadow list (clean up any old entry)
        console.log("[ConversationProvider] DB deletion confirmed. Cleaning shadow list.");
        deletedIdsRef.current.delete(idStr);
        localStorage.setItem("deleted_conversation_ids", JSON.stringify(Array.from(deletedIdsRef.current)));
        await fetchConversations();
      }
    } catch (err) {
      console.error("[ConversationProvider] Critical delete error:", err);
      // Shadow-delete as fallback so UI stays correct
      persistDeletedId(idStr);
    }
  }

  const handleDeleteMessage = async (messageId: string | number) => {
    // 1. Optimistic UI update
    setMessages(messages.filter(m => m.id !== messageId))

    // 2. Cloud removal (Best Effort) - Only if it's a valid UUID
    const isUuid = typeof messageId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    
    if (isUuid) {
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
  const mapCloudMessage = useCallback((msg: any): Message => {
    let text = msg.text || msg.content || "";
    const sender = msg.sender || (msg.role === 'assistant' ? 'ai' : 'user');
    
    // Extract custom ILM metadata
    let meta: any = {};
    const metaMatch = text.match(/\[ILM_META\](.*?)\[\/ILM_META\]/);
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1]);
        text = text.replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/, '').trim();
      } catch (e) {
        console.error("Failed to parse ILM_META", e);
      }
    }

    // Auto-extract citations for AI messages on load/map
    const sources = sender === CHAT_SENDER.AI ? extractLegalSources(text) : undefined;
    const relatedCases = sender === CHAT_SENDER.AI ? extractRelatedCases(text) : undefined;
    const timeline = sender === CHAT_SENDER.AI ? extractTimeline(text) : undefined;

    const cleanText = sender === CHAT_SENDER.AI ? text.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim() : text;

    return {
      ...msg,
      text: cleanText,
      sender,
      sources,
      relatedCases,
      timeline,
      originalText: meta.originalText,
      editedAt: meta.editedAt,
      editedBy: meta.editedBy,
      recordingUrl: meta.recordingUrl,
      voiceNotes: meta.voiceNotes,
      highlights: meta.highlights,
      time: msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : "")
    };
  }, [])

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
        if (error.message === 'Failed to fetch') {
          console.warn("[ConversationProvider] fetchConversations: Network connection issues (Failed to fetch).");
        } else {
          console.error("[ConversationProvider] fetchConversations error:", error.message);
        }
        return;
      }

      if (data) {
        // Double-check: Filter out ANY ID that was deleted in this session
        // AND exclude cases so they don't appear in the standard consultation history UI
        const liveData = data.filter(c => !deletedIdsRef.current.has(c.id.toString()) && !c.title.startsWith('[CASE]'));
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
    syncedConversationId,
    chatSessionId,
    setChatSessionId,
    userId,
    fetchConversations,
    mapCloudMessage,
    supabase
  });

  // Background Cleanup: Retry deleting shadow-items that previously failed (e.g. network error)
  const hasRetriedDeletions = useRef(false);

  useEffect(() => {
    const retryDeletions = async () => {
        if (!userId || deletedIdsRef.current.size === 0 || hasRetriedDeletions.current) return;
        hasRetriedDeletions.current = true;
        
        const idsToRetry = Array.from(deletedIdsRef.current);
        console.log("[ConversationProvider] Retrying shadow-deleted items:", idsToRetry.length);

        for (const id of idsToRetry) {
          const { error, status } = await supabase.from("conversations").delete().eq("id", id);
          // On success OR if not found (already gone), remove from shadow list
          if (!error || status === 404) {
            deletedIdsRef.current.delete(id);
          }
        }
        
        // Persist the (now smaller) shadow list
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
      const existsAsCase = cases.some(c => c.id.toString() === syncedConversationId);
      if (!exists && !existsAsCase) {
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

  // ---- Cases ----
  const fetchCases = useCallback(async () => {
    if (!loggedIn || !userId) return;
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) setCases(data as CaseData[]);
    } catch (err) {
      console.error('[ConversationProvider] fetchCases error:', err);
    }
  }, [loggedIn, userId, supabase]);

  const handleCreateCase = useCallback(async (caseData: { name: string; party: string; notes: string }): Promise<CaseData | null> => {
    if (!userId || !loggedIn) {
      console.warn('[ConversationProvider] handleCreateCase: User not authenticated');
      return null;
    }
    
    try {
      const { data, error } = await supabase.from('cases').insert({
        user_id: userId,
        case_name: caseData.name,
        party_involved: caseData.party,
        notes: caseData.notes,
      }).select().single();

      if (!error && data) {
        // Create an associated invisible conversation for the case chat
        const { error: convError } = await supabase.from('conversations').insert({
          id: data.id,
          user_id: userId,
          title: `[CASE] ${caseData.name}`
        });

        if (convError) {
          console.error('[ConversationProvider] Failed to link conversation to case:', convError.message);
        }

        setCases(prev => [data as CaseData, ...prev]);
        return data as CaseData;
      } else {
        console.error('[ConversationProvider] handleCreateCase error:', error?.message);
        return null;
      }
    } catch (err) {
      console.error('[ConversationProvider] Unexpected error in handleCreateCase:', err);
      return null;
    }
  }, [userId, loggedIn, supabase]);

  const handleDeleteCase = useCallback(async (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('cases').delete().eq('id', id);
    if (error) {
      console.error('[ConversationProvider] handleDeleteCase error:', error.message);
      await fetchCases(); // Revert on failure
    }
  }, [supabase, fetchCases]);

  useEffect(() => {
    if (loggedIn) fetchCases();
  }, [loggedIn, fetchCases]);

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
        updateMessage,
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
        cases,
        refreshCases: fetchCases,
        handleCreateCase,
        handleDeleteCase,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}
