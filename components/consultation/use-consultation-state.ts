import { useState, useRef, RefObject } from "react";
import { Message } from "@/components/conversation-provider/conversation-context";
import { CaseData } from "@/types";
import { createCalendarEvent } from "@/lib/calendar-api";

interface UseConsultationStateProps {
  messages: Message[];
  activeCase?: CaseData | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  supabase?: any;
  userId?: string;
  isGoogleConnected?: boolean;
  handleSendMessage?: (msg: string, ...args: any[]) => void;
  onTabChange?: (tab: "chat" | "timeline" | "mindmap" | "email" | "schedule" | "document") => void;
}

export function useConsultationState({
  messages,
  activeCase,
  scrollContainerRef,
  supabase,
  userId,
  isGoogleConnected,
  handleSendMessage,
  onTabChange,
}: UseConsultationStateProps) {
  const [globalTab, setGlobalTab] = useState<
    "chat" | "timeline" | "mindmap" | "email" | "schedule" | "document"
  >("chat");

  const chatScrollPositionRef = useRef<number>(0);

  const handleTabChange = (tab: typeof globalTab) => {
    if (tab !== "chat" && globalTab === "chat") {
      // Save scroll position before leaving chat
      chatScrollPositionRef.current =
        scrollContainerRef.current?.scrollTop ?? 0;
    }
    setGlobalTab(tab);
    if (tab === "chat") {
      // Restore scroll position when returning to chat
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = chatScrollPositionRef.current;
        }
      }, 0);
    }
  };

  // Email Form State
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [emailErrorMessage, setEmailErrorMessage] = useState("");

  const handleSendEmail = async () => {
    if (!emailTo || !emailBody) return;

    setIsSendingEmail(true);
    setEmailSentStatus("idle");
    setEmailErrorMessage("");

    try {
      const response = await fetch("/api/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject:
            emailSubject ||
            (activeCase
              ? `Update on: ${activeCase.case_name}`
              : "Update from Legal Consultation"),
          body: emailBody,
          type: "direct",
        }),
      });

      if (response.ok) {
        setEmailSentStatus("success");
        // Clear inputs on success
        setEmailTo("");
        setEmailSubject("");
        setEmailBody("");
        setTimeout(() => setEmailSentStatus("idle"), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setEmailErrorMessage(errorData.error || "Failed to send email.");
        setEmailSentStatus("error");
      }
    } catch (error: any) {
      console.error("Failed to send email:", error);
      setEmailErrorMessage(error.message || "An unexpected network error occurred.");
      setEmailSentStatus("error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Schedule Form State
  const [scheduleType, setScheduleType] = useState("Meeting");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleScheduleEvent = async () => {
    if (!scheduleDateTime || !scheduleType) return;
    setIsScheduling(true);

    // Parse date/time into a readable format for the AI
    const dt = new Date(scheduleDateTime);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    try {
      // 1. Create Google Calendar Event (if connected)
      let googleLink = "";
      if (isGoogleConnected && userId) {
        try {
          const start = new Date(scheduleDateTime);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          const toISO = (d: Date) => d.toISOString().slice(0, 19);

          const result = await createCalendarEvent(userId, {
            title: `${scheduleType}: Consultation`,
            start_datetime: toISO(start),
            end_datetime: toISO(end),
            description: scheduleNotes,
          });
          if (result.success && result.link) {
            googleLink = result.link;
          }
        } catch (calendarErr) {
          console.error("Failed to sync with Google Calendar:", calendarErr);
        }
      }

      // 2. Send Notification Email via Resend
      const response = await fetch("/api/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: scheduleEmail,
          type: "schedule",
          eventDetails: {
            eventType: scheduleType,
            dateTime: scheduleDateTime,
            notes: scheduleNotes,
          },
        }),
      });

      if (response.ok) {
        // 2. Persist to Database if logged in
        if (supabase && userId) {
          const { error: dbError } = await supabase
            .from("events")
            .insert({
              user_id: userId,
              title: `${scheduleType}: Consultation`,
              type: scheduleType.toLowerCase(),
              date_time: scheduleDateTime,
              client_email: scheduleEmail,
              notes: scheduleNotes,
            });

          if (dbError) {
            console.error("Failed to save event to database:", dbError.message);
          }
        }

        // 3. Generate AI confirmation prompt (from main)
        const prompt = [
          `[Legal AI] I have scheduled an event. Here are the details:`,
          ``,
          `• Type: ${scheduleType}`,
          `• Date: ${dateStr}`,
          `• Time: ${timeStr}`,
          scheduleEmail ? `• Client/Attendee Email: ${scheduleEmail}` : null,
          scheduleNotes ? `• Notes: ${scheduleNotes}` : null,
          googleLink ? `• Google Calendar Link: ${googleLink}` : null,
          ``,
          `The automation has sent the invitation email and added it to the internal records. Please acknowledge this in our chat.`,
        ]
          .filter((line) => line !== null)
          .join('\n');

        if (handleSendMessage) {
          handleSendMessage(prompt);
        }

        setScheduleStatus("success");
        // Clear inputs after a delay
        setTimeout(() => {
          setScheduleStatus("idle");
          setScheduleType("Meeting");
          setScheduleDateTime("");
          setScheduleEmail("");
          setScheduleNotes("");
          if (onTabChange) onTabChange('chat');
        }, 3000);
      } else {
        setScheduleStatus("error");
      }
    } catch (error) {
      console.error("Failed to schedule event:", error);
      setScheduleStatus("error");
    } finally {
      setIsScheduling(false);
    }
  };


  // Derived Data: Timeline
  const latestTimelineMessage = [...messages]
    .reverse()
    .find((m) => m.timeline && m.timeline.length > 0);
  let activeTimeline = latestTimelineMessage?.timeline || [];

  const isBasicPlaceholder =
    activeTimeline.length === 1 &&
    (activeTimeline[0].title === "Created Case" ||
      activeTimeline[0].title === "Case Created");

  if ((activeTimeline.length === 0 || isBasicPlaceholder) && activeCase) {
    // Generate basic case placeholder timeline
    const caseDate = activeCase.created_at
      ? new Date(activeCase.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    activeTimeline = [
      {
        date: caseDate,
        title: "Case Created",
        description: `Case "${activeCase.case_name || "Untitled"}" was opened. Parties involved: ${activeCase.party_involved || "Not specified"}.`,
        status: "completed",
        requires_previous: false,
      },
      {
        date: "",
        title: "Initial Analysis",
        description:
          activeCase.notes && activeCase.notes.length > 10
            ? `Reviewing initial notes: "${activeCase.notes.substring(0, 120)}${activeCase.notes.length > 120 ? "..." : ""}"`
            : "Analyzing case details and identifying material facts.",
        status: "pending",
        requires_previous: false,
      },
      {
        date: "",
        title: "Strategic Planning",
        description:
          "Awaiting AI to establish theoretical basis and actionable steps.",
        status: "pending",
        requires_previous: true,
      },
    ];
  }

  // Derived Data: MindMap
  const latestMindMapMessage = [...messages]
    .reverse()
    .find((m) => m.mindMap && Object.keys(m.mindMap).length > 0);
  let activeMindMap = latestMindMapMessage?.mindMap;

  if (!activeMindMap && activeCase) {
    const partyLabels = (activeCase.party_involved || "")
      .split(/[,\/]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p, i) => ({
        id: `party-role-${i}`,
        label: `Principal Party`,
        children: [
          {
            id: `party-name-${i}`,
            label: p,
            children: [],
          },
        ],
      }));

    const noteLines = (activeCase.notes || "")
      .split(/[.\n]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 15)
      .slice(0, 6);

    const factNodes = noteLines.map((l, i) => ({
      id: `fact-${i}`,
      label: l.length > 55 ? l.substring(0, 55) + "..." : l,
      children: [],
    }));

    activeMindMap = {
      id: "root",
      label: activeCase.case_name || "Case Analysis",
      children: [
        {
          id: "c1",
          label: "Key Parties",
          children: partyLabels,
        },
        {
          id: "c3",
          label: "Evidence & Facts",
          children:
            factNodes.length > 0
              ? factNodes
              : [
                {
                  id: "e-empty",
                  label: "Extracting key evidence...",
                  children: [],
                },
                {
                  id: "f-empty",
                  label: "Identifying material facts...",
                  children: [],
                },
              ],
        },
        {
          id: "c2",
          label: "Legal Strategy",
          children: [
            { id: "s1", label: "Theoretical Basis", children: [] },
            { id: "s2", label: "Actionable Steps", children: [] },
          ],
        },
        {
          id: "c4",
          label: "Laws & Jurisprudence",
          children: [
            { id: "l1", label: "Relevant Statutes", children: [] },
            { id: "l2", label: "Case Jurisprudence", children: [] },
          ],
        },
      ],
    };
  }

  return {
    globalTab,
    setGlobalTab,
    handleTabChange,
    emailState: {
      emailTo,
      setEmailTo,
      emailSubject,
      setEmailSubject,
      emailBody,
      setEmailBody,
      isSendingEmail,
      emailSentStatus,
      emailErrorMessage,
      handleSendEmail,
    },
    scheduleState: {
      scheduleType,
      setScheduleType,
      scheduleDateTime,
      setScheduleDateTime,
      scheduleEmail,
      setScheduleEmail,
      scheduleNotes,
      setScheduleNotes,
      isScheduling,
      scheduleStatus,
      handleScheduleEvent,
    },
    derivedData: {
      activeTimeline,
      activeMindMap,
    },
  };
}
