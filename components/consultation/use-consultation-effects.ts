import { useEffect, useRef, RefObject } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Message } from "@/components/conversation-provider/conversation-context";
import { CHAT_SENDER } from "@/lib/constants";

interface UseConsultationEffectsProps {
  messages: Message[];
  isLoading: boolean;
  router: AppRouterInstance;
  currentConsultationId: string | number | null;
  activeConversationId: string | undefined;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  handleSendMessage: (
    text: string,
    targetConversationId?: string | number,
    explicitDocumentContext?: string | null,
    file?: File | null,
    skipAIResponse?: boolean
  ) => Promise<string | number | undefined>;
}

export function useConsultationEffects({
  messages,
  isLoading,
  router,
  currentConsultationId,
  activeConversationId,
  scrollContainerRef,
  handleSendMessage,
}: UseConsultationEffectsProps) {
  const prevMessagesLengthRef = useRef(messages.length);
  const lastIdRef = useRef<string | null>(null);
  // Keep a stable ref to handleSendMessage to avoid re-triggering effects
  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => { handleSendMessageRef.current = handleSendMessage; }, [handleSendMessage]);

  // Auto-scroll logic: scroll to top of new AI messages, bottom for user messages.
  // Depends on messages.length (not the full array reference) so streaming text
  // updates don't re-run this effect on every chunk.
  useEffect(() => {
    if (
      scrollContainerRef.current &&
      messages.length > prevMessagesLengthRef.current
    ) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.sender === CHAT_SENDER.AI) {
        setTimeout(() => {
          const el = document.getElementById(
            `message-bubble-${latestMessage.id}`
          );
          if (el && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const topPos =
              el.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop;
            container.scrollTo({
              top: topPos - 24,
              behavior: "smooth",
            });
          }
        }, 150);
      } else {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 50);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollContainerRef]);

  // Handle URL hash scrolling (e.g., from bookmarks)
  useEffect(() => {
    const handleHashScroll = () => {
      if (messages.length === 0) return;
      const hash = window.location.hash;
      if (hash && hash.startsWith("#message-")) {
        const messageId = hash.replace("#message-", "");
        setTimeout(() => {
          const el = document.getElementById(`message-bubble-${messageId}`);
          if (el && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const topPos =
              el.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop;
            container.scrollTo({
              top: topPos - 100, // Extra padding for the header
              behavior: "smooth",
            });
            // Clear hash after scrolling to allow re-triggering
            router.replace(window.location.pathname, { scroll: false });
          }
        }, 300); // Wait for potential rendering/loading
      }
    };

    // Attempt to scroll when messages array changes
    handleHashScroll();

    // Listen to hashchange event if already on the page
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, [messages.length, router, scrollContainerRef]);

  // Sync state to URL for new consultations
  useEffect(() => {
    // Only redirect if we have a real UUID (string), we aren't already on that URL, AND we aren't viewing a case
    const shouldRedirect =
      currentConsultationId &&
      typeof currentConsultationId === "string" &&
      !activeConversationId &&
      !window.location.pathname.startsWith("/cases/") &&
      currentConsultationId !== lastIdRef.current;

    if (shouldRedirect) {
      lastIdRef.current = currentConsultationId as string;
      // Use replace so we don't blow up the history stack, and it transitions smoothly
      router.replace(`/consultation/${currentConsultationId}`);
    }
  }, [currentConsultationId, activeConversationId, router]);

  // Handle Legal Wizard Data
  useEffect(() => {
    const wizardDataStr = sessionStorage.getItem("legal_wizard_data");

    // Check if we have data, no messages, no active consultation, AND checking isLoading to ensure socket is likely ready
    if (
      wizardDataStr &&
      messages.length === 0 &&
      !currentConsultationId &&
      !isLoading
    ) {
      try {
        const data = JSON.parse(wizardDataStr);

        // Construct a more natural "User" message
        // Handle "Other" vs specific categories text
        const issueText = data.specificIssue
          ? `specifically regarding ${data.specificIssue}`
          : "";
        const descriptionText = data.description
          ? `Here are the details: "${data.description}"`
          : "";

        const prompt = `I am a ${data.userType} dealing with a ${data.legalArea} matter ${issueText}. ${descriptionText} ${data.consultationHistory}. My primary goal is to ${data.primaryGoal}. The situation is ${data.urgency}.`;

        // Store wizard data in sessionStorage with a special flag for title generation
        sessionStorage.setItem(
          "wizard_title_data",
          JSON.stringify({
            userType: data.userType,
            legalArea: data.legalArea,
            specificIssue:
              data.specificIssue || data.description?.substring(0, 30),
          })
        );

        // Small delay to ensure socket/auth is stable
        const timer = setTimeout(() => {
          handleSendMessageRef.current(prompt);
          sessionStorage.removeItem("legal_wizard_data");
        }, 500);

        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Failed to parse wizard data", e);
      }
    }
  }, [messages.length, currentConsultationId, isLoading]);
}
