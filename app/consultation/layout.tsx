'use client'

import { ConversationProvider } from "@/components/conversation-provider"

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ConversationProvider>{children}</ConversationProvider>
}
