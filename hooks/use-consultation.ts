import { useConversations } from "@/components/conversation-provider"

export function useConsultation(_userId?: string, _syncedConversationId?: string) {
  const {
    messages,
    isLoading,
    recentConsultations,
    currentConsultationId,
    handleLoadConsultation,
    handleNewConsultation,
    handleRemoveConsultation,
    handleSendMessage,
    handleDeleteMessage
  } = useConversations()

  return {
    messages,
    isLoading,
    recentConsultations,
    currentConsultationId,
    handleLoadConsultation,
    handleNewConsultation,
    handleRemoveConsultation,
    handleSendMessage,
    handleDeleteMessage
  }
}
