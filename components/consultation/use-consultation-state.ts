import { useState, useRef, useEffect, RefObject } from "react";
import { Message } from "@/components/conversation-provider/conversation-context";
import { CaseData } from "@/types";
import { createCalendarEvent } from "@/lib/calendar-api";

/** Get the minimum datetime allowed (current datetime in datetime-local format) */
function getMinDateTime(): string {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:mm using local timezone
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface UseConsultationStateProps {
  messages: Message[];
  activeCase?: CaseData | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  userId?: string;
  userEmail?: string;
  userName?: string;
  providerToken?: string | null;
  isGoogleConnected?: boolean;
  handleSendMessage?: (msg: string, ...args: any[]) => void;
  onTabChange?: (tab: "chat" | "timeline" | "mindmap" | "email" | "schedule" | "document" | "transcribe") => void;
  consultationTitle?: string;
}

export function useConsultationState({
  messages,
  activeCase,
  scrollContainerRef,
  userId,
  providerToken,
  userEmail,
  userName,
  isGoogleConnected,
  handleSendMessage,
  onTabChange,
  consultationTitle,
}: UseConsultationStateProps) {
  const [globalTab, setGlobalTab] = useState<
    "chat" | "timeline" | "mindmap" | "email" | "schedule" | "document" | "transcribe"
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
  const [emailTo, setEmailTo] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");

  const handleSendEmail = () => {
    if (emailTo.length === 0 || !emailBody) return;
    setIsEmailPreviewOpen(true);
  };

  const handleConfirmSendEmail = async () => {
    if (emailTo.length === 0 || !emailBody) return;

    setIsSendingEmail(true);
    setEmailSentStatus("idle");
    setEmailErrorMessage("");

    try {
      const response = await fetch("/api/send-email", {
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
          organizer: {
            name: userName || userEmail,
            email: userEmail
          }
        }),
      });

      if (response.ok) {
        setEmailSentStatus("success");
        setEmailSentStatus("success");
        // Clear inputs on success
        setEmailTo([]);
        setEmailSubject("");
        setEmailBody("");
        setIsEmailPreviewOpen(false); // Close preview
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
  const [scheduleEmails, setScheduleEmails] = useState<string[]>([]);
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<
    "idle" | "drafted" | "success" | "error"
  >("idle");
  const [draftedEventId, setDraftedEventId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSchedulePreviewOpen, setIsSchedulePreviewOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Automatic conflict check as the user picks date/time
  useEffect(() => {
    if (!scheduleDateTime || !userId) {
      setConflictWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // Calculate overlap range (e.g., 59 minutes before/after)
        const checkTime = new Date(scheduleDateTime);
        if (isNaN(checkTime.getTime())) return; // Avoid querying with invalid dates

        const startRange = new Date(checkTime.getTime() - 59 * 60 * 1000).toISOString();
        const endRange = new Date(checkTime.getTime() + 59 * 60 * 1000).toISOString();

        const params = new URLSearchParams({
          startRange,
          endRange,
          excludeStatus: "cancelled",
          ...(draftedEventId ? { excludeId: draftedEventId } : {}),
        });
        const res = await fetch(`/api/events?${params}`);
        const { events: conflicts } = res.ok ? await res.json() : { events: [] };

        if (conflicts && conflicts.length > 0) {
          const conflictTime = new Date(conflicts[0].dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          setConflictWarning(`Overlap detected: You already have "${conflicts[0].title}" at ${conflictTime}.`);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.error("Conflict check failed:", err);
      }
    }, 200); // reduced to 200ms for "instant" feel

    return () => clearTimeout(timer);
  }, [scheduleDateTime, userId, draftedEventId]);

  const handleScheduleEvent = async () => {
    if (!scheduleDateTime || !scheduleType || !userId || scheduleEmails.length === 0) return;
    setIsScheduling(true);
    setScheduleError(null);

    // Validate that the selected date/time is not in the past
    const selectedDateTime = new Date(scheduleDateTime);
    const currentDateTime = new Date();

    if (selectedDateTime < currentDateTime) {
      setScheduleError("Cannot schedule events for past dates. Please select a future date and time.");
      setIsScheduling(false);
      return;
    }

    // Parse date/time into a readable format for the AI
    const dt = new Date(scheduleDateTime);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    try {
      const evtRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeCase?.case_name || consultationTitle || 'Consultation',
          type: scheduleType.toLowerCase(),
          date_time: new Date(scheduleDateTime).toISOString(),
          client_email: scheduleEmails.join(', '),
          notes: scheduleNotes,
          status: "pending"
        })
      });

      if (!evtRes.ok) throw new Error('Failed to create event');
      const { event: data } = await evtRes.json();

      setDraftedEventId(data.id);
      setScheduleStatus("drafted");
      setIsSchedulePreviewOpen(true);

    } catch (err: any) {
      console.error("Error drafting schedule:", err);
      setScheduleStatus("error");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleFinalizeSchedule = async () => {
    if (!draftedEventId || !userId || scheduleEmails.length === 0) return;
    setIsScheduling(true);
    try {
      // 1. Sync with Google Calendar if connected
      let googleLink: string | null = null;
      let iCalUID: string | undefined;
      let googleEventId: string | undefined;

      if (isGoogleConnected) {
        const start = new Date(scheduleDateTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const result = await createCalendarEvent(userId ?? '', {
          title: activeCase?.case_name
            ? activeCase.case_name
            : consultationTitle
              ? consultationTitle
              : `Consultation`,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          description: scheduleNotes,
          type: scheduleType.toLowerCase() as any,
          client_email: scheduleEmails.join(', ')
        }, providerToken);
        if (result.success) {
          if (result.link) googleLink = result.link;
          iCalUID = result.iCalUID;
          googleEventId = result.event_id;
        }
      }

      // 2. Update status to pending and save Google data
      const updatePayload: any = { status: "pending", google_link: googleLink };
      if (googleEventId) updatePayload.google_event_id = googleEventId;

      const updateRes = await fetch(`/api/events/${draftedEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!updateRes.ok) throw new Error('Database update failed');

      // 3. Trigger Email API
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: scheduleEmails,
          type: "schedule",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          eventDetails: {
            eventId: draftedEventId,
            eventType: scheduleType,
            title: activeCase?.case_name || consultationTitle || scheduleType || 'Consultation',
            dateTime: new Date(scheduleDateTime).toISOString(),
            notes: scheduleNotes,
            iCalUID: iCalUID
          },
          organizer: {
            name: userName || userEmail,
            email: userEmail
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Email API failed with status ${response.status}`);
      }

      setScheduleStatus("success");
      setConflictWarning(null); // Clear warning on success

      // Reset form and clear state IMMEDIATELY so the user sees a blank form
      setDraftedEventId(null);
      setIsSchedulePreviewOpen(false);

      // Clear all form inputs
      setScheduleType("Meeting");
      setScheduleDateTime("");
      setScheduleEmails([]);
      setScheduleNotes("");

      // Revert status to idle after a delay (allows for success UI to show)
      setTimeout(() => {
        setScheduleStatus("idle");
      }, 3000);

    } catch (err: any) {
      console.error("Technical error finalizing schedule:", err);
      // Log more context
      if (err instanceof Error) {
        console.error("Error Detail:", err.message);
      }
      setScheduleStatus("error");
    } finally {
      setIsScheduling(false);
    }
  };


  const isRelevantTimeline = (timeline: any[]) => {
    if (!timeline || timeline.length === 0) return false;
    // A timeline is relevant if it has more than 2 steps OR its steps aren't just generic placeholders
    if (timeline.length > 3) return true;

    const genericTitles = ["Case Created", "Initial Analysis", "Strategic Planning", "Assessment", "Consultation", "Case Assessment"];
    const meaningfulSteps = timeline.filter(item =>
      !genericTitles.some(gt => item.title.includes(gt)) &&
      item.description && item.description.length > 15
    );
    return meaningfulSteps.length > 0;
  };

  const isRelevantMindMap = (mindMap: any) => {
    if (!mindMap || !mindMap.children || mindMap.children.length === 0) return false;

    // Check if any of the main categories have actual data (not just "Extracting..." placeholders)
    const hasMeaningfulContent = mindMap.children.some((child: any) => {
      if (!child.children || child.children.length === 0) return false;
      return child.children.some((grandchild: any) => {
        const label = (grandchild.label || "").toLowerCase();
        return !label.includes("extracting") && !label.includes("identifying") && !label.includes("awaiting");
      });
    });

    return hasMeaningfulContent;
  };

  // Derived Data: Timeline
  const latestTimelineMessage = [...messages]
    .reverse()
    .find((m) => m.timeline && m.timeline.length > 0 && isRelevantTimeline(m.timeline));

  // Fallback to latest available if no "relevant" one found yet, to at least show something
  const fallbackTimelineMessage = latestTimelineMessage || [...messages]
    .reverse()
    .find((m) => m.timeline && m.timeline.length > 0);

  let activeTimeline = fallbackTimelineMessage?.timeline || [];

  // Prepend a "Case Created" completed step when AI timeline is available but lacks it
  if (activeTimeline.length > 0 && activeCase) {
    const hasCreatedStep = activeTimeline.some((t: any) =>
      t.title?.toLowerCase().includes("case created") ||
      t.title?.toLowerCase().includes("created case")
    );
    if (!hasCreatedStep) {
      const caseDate = activeCase.created_at
        ? new Date(activeCase.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      activeTimeline = [
        {
          date: caseDate,
          title: "Case Created",
          description: `Case "${activeCase.case_name || "Untitled"}" opened. Parties: ${activeCase.party_involved || "Not specified"}.`,
          status: "completed",
          requires_previous: false,
        },
        ...activeTimeline,
      ];
    }
  }

  const isBasicPlaceholder =
    activeTimeline.length === 1 &&
    (activeTimeline[0].title === "Created Case" ||
      activeTimeline[0].title === "Case Created");

  if ((activeTimeline.length === 0 || isBasicPlaceholder) && activeCase) {
    const caseDate = activeCase.created_at
      ? new Date(activeCase.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const notes = activeCase.notes || "";
    const caseName = activeCase.case_name || "Untitled";
    const parties = activeCase.party_involved || "Not specified";
    const fullText = caseName + " " + parties + " " + notes;

    // ── Extract specific dates mentioned in notes ───────────────────────────
    const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
    const dateRe = new RegExp(`((?:before\\s+)?(?:${MONTHS})\\s+\\d{1,2},?\\s*\\d{4})`, "gi");
    const datesInNotes: { raw: string; iso: string; context: string }[] = [];
    let dm: RegExpExecArray | null;
    while ((dm = dateRe.exec(notes)) !== null) {
      const raw = dm[1];
      const ctx = notes.substring(Math.max(0, dm.index - 80), dm.index + raw.length + 100).trim();
      const parsed = new Date(raw.replace(/^before\s+/i, ""));
      const iso = isNaN(parsed.getTime()) ? "" :
        `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      datesInNotes.push({ raw, iso, context: ctx });
    }

    // ── Extract action items from attorney notes section ───────────────────
    const attySection = notes.match(/attorney['']?s?\s*notes[\s\S]*/i)?.[0] || notes;
    const ACTION_VERBS = /^(?:Obtain|File|Verify|Assess|Open|Evaluate|Prepare and|Gather|Collect|Submit|Attend|Review|Draft|Investigate|Analyze|Contact|Reach out|Advise|Ensure|Monitor|Bring|Present|Schedule|Strictly|Do not|Avoid|Request|Explore|Establish|Interview|Open)/i;
    // Skip lines that are metadata (headers, "Prepared by:", dates, short labels)
    const SKIP_RE = /^(?:prepared\s+by|date:|time:|location:|present:|attorney|notes|case\s+summary|charges?)/i;

    const actionItems = attySection
      .split("\n")
      .map((l) => l
        .replace(/^[-•*\d.]+\s*/, "")   // strip bullet/number prefix
        .replace(/\*\*/g, "")            // strip markdown bold markers
        .trim()
      )
      .filter((l) => l.length > 15 && ACTION_VERBS.test(l) && !SKIP_RE.test(l))
      .slice(0, 8);

    // ── Map action items → timeline steps with dates where found ──────────
    const TITLE_LIMIT = 45;

    // Generate a contextual description based on the action verb — adds value, never repeats title
    const getActionContext = (item: string): string => {
      const lower = item.toLowerCase();
      if (/^obtain|^retrieve|^get\b/.test(lower)) return "Secure this document and keep it on file for the defense.";
      if (/^verify|^confirm|^check/.test(lower)) return "Validate and document findings for evidentiary purposes.";
      if (/^gather|^collect|^compile/.test(lower)) return "Organize all retrieved materials systematically for easy reference.";
      if (/^prepare|^draft/.test(lower)) return "Review carefully before submission — errors may affect the case outcome.";
      if (/^file|^submit|^send/.test(lower)) return "Ensure timely filing with proper documentation and proof of submission.";
      if (/^explore|^assess|^evaluate/.test(lower)) return "Weigh all options and document findings before proceeding.";
      if (/^open|^initiate|^start/.test(lower)) return "Establish formal communication and keep a record of all exchanges.";
      if (/^interview|^meet|^consult/.test(lower)) return "Prepare questions in advance and document all responses thoroughly.";
      if (/^schedule|^arrange/.test(lower)) return "Coordinate with all parties and confirm attendance in writing.";
      if (/^strictly|^do not|^avoid/.test(lower)) return "Non-compliance may constitute an admission or waiver of rights.";
      if (/^monitor|^track|^follow/.test(lower)) return "Document all developments and report promptly to counsel.";
      return "Complete this action and update the status when done.";
    };

    const stepsFromNotes = actionItems.map((item, i) => {
      const matchedDate = datesInNotes.find((d) => {
        const itemLower = item.toLowerCase();
        const dateLower = d.raw.replace(/^before\s+/i, "").toLowerCase();
        return itemLower.includes(dateLower);
      });
      return {
        title: item.length > TITLE_LIMIT ? item.substring(0, TITLE_LIMIT) + "..." : item,
        description: getActionContext(item),
        date: matchedDate?.iso || "",
        status: "pending",
        requires_previous: i > 1,
      };
    });

    // ── Detect case type for fallback steps ───────────────────────────────
    const isCriminal = /estafa|murder|homicide|theft|robbery|rape|libel|slander|bp\s*22|bounced|qualified|illegal|drug|accused|criminal/i.test(fullText);
    const isCivil = /civil|breach|contract|damages|property|partition|collection|sum|money|debt/i.test(fullText);
    const isFamily = /annulment|custody|support|nullity|marriage|adoption|family/i.test(fullText);

    const fallbackSteps = isCriminal
      ? [
        { title: "Gather Evidence & Documents", description: "Collect MOA, receipts, bank records, text messages, and emails related to the case.", date: "", status: "pending", requires_previous: false },
        { title: "Prepare Counter-Affidavit", description: "Draft and file a counter-affidavit addressing the charges before the deadline.", date: datesInNotes.find(d => /counter.?affidavit|april 30/i.test(d.context))?.iso || "", status: "pending", requires_previous: true },
        { title: "Attend Preliminary Investigation", description: "Appear before the prosecutor for preliminary investigation proceedings.", date: "", status: "pending", requires_previous: true },
        { title: "Settlement Discussions", description: "Explore settlement options with the prosecutor's office.", date: "", status: "pending", requires_previous: false },
        { title: "Trial Preparation", description: "Prepare witnesses, exhibits, and legal arguments for trial.", date: "", status: "pending", requires_previous: true },
      ]
      : isFamily
        ? [
          { title: "Gather Documents", description: "Collect marriage certificate, birth certificates, and financial records.", date: "", status: "pending", requires_previous: false },
          { title: "File Petition", description: "File the appropriate petition with the Regional Trial Court (Family Court).", date: "", status: "pending", requires_previous: true },
          { title: "Attend Mediation", description: "Participate in court-ordered mediation or judicial dispute resolution.", date: "", status: "pending", requires_previous: true },
          { title: "Trial Proper", description: "Present evidence and arguments before the court.", date: "", status: "pending", requires_previous: true },
          { title: "Await Decision", description: "Await the court's decision and prepare for any appeal.", date: "", status: "pending", requires_previous: true },
        ]
        : isCivil
          ? [
            { title: "Send Demand Letter", description: "Send a formal demand letter to the opposing party.", date: "", status: "pending", requires_previous: false },
            { title: "File Complaint", description: "Prepare and file the complaint with the appropriate court.", date: "", status: "pending", requires_previous: true },
            { title: "Attend Pre-Trial Conference", description: "Participate in pre-trial conference and submit pre-trial brief.", date: "", status: "pending", requires_previous: true },
            { title: "Present Evidence", description: "Present documentary evidence and witness testimonies.", date: "", status: "pending", requires_previous: true },
            { title: "Await Judgment", description: "Await court judgment and prepare for execution or appeal.", date: "", status: "pending", requires_previous: true },
          ]
          : [
            { title: "Gather Evidence & Documents", description: "Collect all relevant evidence, documents, and witness information.", date: "", status: "pending", requires_previous: false },
            { title: "Legal Research", description: "Research applicable laws, regulations, and jurisprudence.", date: "", status: "pending", requires_previous: true },
            { title: "Prepare Legal Strategy", description: "Develop a comprehensive legal strategy based on case facts.", date: "", status: "pending", requires_previous: true },
            { title: "File Appropriate Pleadings", description: "Draft and file the necessary pleadings or motions.", date: "", status: "pending", requires_previous: true },
            { title: "Attend Hearings", description: "Appear in court and present arguments and evidence.", date: "", status: "pending", requires_previous: true },
          ];

    const steps = stepsFromNotes.length >= 2 ? stepsFromNotes : fallbackSteps;

    // Build a clean short party summary (names only, no addresses)
    const partyShortList = parties
      .split(/[\n,]/)
      .map((p) => p.replace(/\(.*?\)/g, "").replace(/,.*$/, "").trim())
      .filter((p) => p.length > 2 && /[A-Za-z]/.test(p) && !/^(?:residing|represented|atty\.|office|city|\d)/i.test(p))
      .slice(0, 4)
      .join(", ");

    activeTimeline = [
      {
        title: "Case Created",
        description: `Case "${caseName}" opened. Parties: ${partyShortList || parties.split("\n")[0] || "Not specified"}.`,
        date: caseDate,
        status: "completed",
        requires_previous: false,
      },
      ...steps,
    ];
  }

  // Derived Data: MindMap
  const latestMindMapMessage = [...messages]
    .reverse()
    .find((m) => m.mindMap && Object.keys(m.mindMap).length > 0 && isRelevantMindMap(m.mindMap));

  const fallbackMindMapMessage = latestMindMapMessage || [...messages]
    .reverse()
    .find((m) => m.mindMap && Object.keys(m.mindMap).length > 0);

  let activeMindMap = fallbackMindMapMessage?.mindMap;

  // Calculate briefcaseAttachments
  const briefcaseAttachments: any[] = [];
  messages.forEach(m => {
    const docs = m.fileAttachments || (m.fileAttachment ? [m.fileAttachment] : []);
    docs.forEach((doc: any) => {
      if (doc.url) briefcaseAttachments.push({ ...doc, messageId: m.id });
    });
  });
  console.log("Collected briefcase attachments:", briefcaseAttachments);

  // Create vault nodes
  const vaultNodes = briefcaseAttachments.map((att, i) => {
    const isImage = att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isAudio = att.name?.match(/\.(mp3|wav|ogg|m4a)$/i);
    return {
      id: `vault-briefcase-${i}`,
      label: att.name || 'Document',
      description: att.ai_summary || `Legal Evidence: ${att.name}`,
      media: [{ type: isImage ? 'image' : (isAudio ? 'audio' : 'file'), url: att.url, name: att.name }],
      children: []
    };
  });

  if (!activeMindMap && activeCase) {
    // Key Parties — extract names grouped by role
    const rawParties = activeCase.party_involved || "";
    const caseName = activeCase.case_name || "";

    const ROLE_KEYWORDS = [
      "Defendant", "Plaintiff", "Complainant", "Respondent",
      "Petitioner", "Accused", "Appellant", "Appellee",
      "Intervenor", "Complaining Witness", "Third Party", "Witness",
    ];

    const normalizeRole = (r: string) =>
      ROLE_KEYWORDS.find((k) => k.toLowerCase() === r.toLowerCase()) || r;

    // Extract the name from a line — everything before the first comma is the name
    const extractNameFromLine = (line: string): string => {
      return line
        .replace(/^(?:Plaintiff|Defendant|Complainant|Respondent|Petitioner|Accused|Appellant|Appellee|Intervenor|Complaining\s+Witness|Witness|Third\s+Party)[:\s]*/i, "")
        .replace(/\(.*?\)/g, "")
        .split(",")[0]
        .trim();
    };

    // Build a clean description for a party — role + meaningful context, no address
    const buildPartyDescription = (role: string, name: string, rawLine: string): string => {
      const parts: string[] = [`${role}: ${name}`];
      // Counsel
      const counselMatch = rawLine.match(/represented\s+by\s+(Atty\.\s+[\w\s.]+?)(?:,\s*(?:of|Office)|$)/i);
      if (counselMatch) parts.push(`Counsel: ${counselMatch[1].trim()}`);
      // Extra context after period (e.g. "Former business partner of the accused")
      const extraMatch = rawLine.match(/\.\s+([A-Z][^.]{10,80}[.!]?)$/);
      if (extraMatch) parts.push(extraMatch[1].trim());
      return parts.join(" — ");
    };

    const partyNodes = (() => {
      const results: { role: string; name: string; description: string }[] = [];

      // ── Strategy 1: Newline-structured format ─────────────────────────────
      // Handles both:
      //   A) "Plaintiff\nPeople of the Philippines, ..."  (role on own line)
      //   B) "Plaintiff: People of the Philippines, ..."  (role + name on same line)
      //   C) "Plaintiff People of the Philippines, ..."   (role prefix, no colon)
      const ROLE_PREFIX_LINE_RE = new RegExp(
        `^(${ROLE_KEYWORDS.map((k) => k.replace(" ", "\\s+")).join("|")})[:\\s]+(.+)$`,
        "i"
      );
      const ROLE_ONLY_LINE_RE = new RegExp(
        `^(${ROLE_KEYWORDS.map((k) => k.replace(" ", "\\s+")).join("|")})\\s*$`,
        "i"
      );

      const lines = rawParties.split(/\n/).map((l) => l.trim()).filter(Boolean);
      let currentRole = "";

      for (const line of lines) {
        // Case A: line is ONLY a role keyword → set current role for next line
        const roleOnlyMatch = line.match(ROLE_ONLY_LINE_RE);
        if (roleOnlyMatch) {
          currentRole = normalizeRole(roleOnlyMatch[1]);
          continue;
        }

        // Case B/C: line starts with role keyword + colon/space then name
        const rolePrefixMatch = line.match(ROLE_PREFIX_LINE_RE);
        if (rolePrefixMatch) {
          currentRole = normalizeRole(rolePrefixMatch[1]);
          const name = extractNameFromLine(line);
          if (!name || name.length < 2) continue;
          if (results.some((r) => r.name.toLowerCase() === name.toLowerCase())) continue;
          results.push({ role: currentRole, name, description: buildPartyDescription(currentRole, name, line) });
          continue;
        }

        // Case D: plain name line (role already set from previous iteration)
        const name = extractNameFromLine(line);
        if (!name || name.length < 2) continue;
        if (results.some((r) => r.name.toLowerCase() === name.toLowerCase())) continue;
        results.push({ role: currentRole || "Party", name, description: buildPartyDescription(currentRole || "Party", name, line) });
      }

      // Post-process: if all roles are "Party", try to assign from "v." in case name
      if (results.length > 0 && results.every((r) => r.role === "Party")) {
        const vsMatch = caseName.match(/^(.+?)\s+v(?:s?\.|ersus)\s+(.+)$/i);
        if (vsMatch) {
          const leftName = extractNameFromLine(vsMatch[1]);
          const rightName = extractNameFromLine(vsMatch[2]);
          results.forEach((r) => {
            if (leftName && r.name.toLowerCase().includes(leftName.toLowerCase()))
              r.role = "Plaintiff";
            else if (rightName && r.name.toLowerCase().includes(rightName.toLowerCase()))
              r.role = "Defendant";
          });
        }
      }

      // ── Strategy 1b: Old comma-separated format (legacy data before newline fix) ─
      // If no newlines found but there are multiple parties, split by ", " but
      // treat each original party input as separated by ", " at the top level.
      // We detect this by checking if rawParties has no newlines.
      if (results.length === 0 && !rawParties.includes("\n")) {
        // Each party input was joined with ", " — but party descriptions also contain commas.
        // Best heuristic: split on ", " followed by a role keyword or capital name.
        const ROLE_PREFIX_RE = new RegExp(
          `(?:,\\s*)(?=${ROLE_KEYWORDS.map((k) => k.replace(" ", "\\s+")).join("|")}|[A-Z][a-z]+ [A-Z])`,
          "g"
        );
        const chunks = rawParties.split(ROLE_PREFIX_RE).map((c) => c.trim()).filter(Boolean);
        chunks.forEach((chunk, i) => {
          const INLINE_ROLE_RE = new RegExp(`^(${ROLE_KEYWORDS.join("|")})[:\\s]+`, "i");
          const roleMatch = chunk.match(INLINE_ROLE_RE);
          const role = roleMatch ? normalizeRole(roleMatch[1]) : "Party";
          const name = extractNameFromLine(chunk);
          if (!name || name.length < 2) return;
          if (results.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
          results.push({ role, name, description: chunk });
        });
      }

      // ── Strategy 2: Inline roles — "Defendant: Ramon" or "Ramon (Defendant)" ─
      if (results.length === 0) {
        const INLINE_ROLE_RE = new RegExp(`(${ROLE_KEYWORDS.join("|")})`, "i");
        rawParties.split(/[,\/\n]/).forEach((chunk) => {
          const part = chunk.trim();
          if (!part || part.length < 3) return;
          const roleMatch = part.match(INLINE_ROLE_RE);
          const inlineRole = part.match(/\(([^)]+)\)/)?.[1];
          const role = roleMatch
            ? normalizeRole(roleMatch[1])
            : inlineRole && ROLE_KEYWORDS.some((k) => k.toLowerCase() === inlineRole.toLowerCase())
              ? normalizeRole(inlineRole)
              : "Party";
          const name = extractNameFromLine(part);
          if (!name || name.length < 2) return;
          if (results.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
          results.push({ role, name, description: part });
        });
      }

      // ── Strategy 3: "X v. Y" from case name ────────────────────────────────
      const vsMatch = caseName.match(/^(.+?)\s+v(?:s?\.|ersus)\s+(.+)$/i);
      if (vsMatch) {
        const leftName = extractNameFromLine(vsMatch[1]);
        const rightName = extractNameFromLine(vsMatch[2]);
        if (leftName && !results.some((r) => r.name.toLowerCase() === leftName.toLowerCase()))
          results.push({ role: "Plaintiff", name: leftName, description: vsMatch[1].trim() });
        if (rightName && !results.some((r) => r.name.toLowerCase() === rightName.toLowerCase()))
          results.push({ role: "Defendant", name: rightName, description: vsMatch[2].trim() });
      }

      if (results.length === 0) return [];

      // Group by role
      const grouped = new Map<string, typeof results>();
      for (const r of results) {
        if (!grouped.has(r.role)) grouped.set(r.role, []);
        grouped.get(r.role)!.push(r);
      }

      // Flat list if all are "Party"
      if (grouped.size === 1 && grouped.has("Party")) {
        return results.map((r, i) => ({
          id: `party-${i}`, label: r.name, description: r.description, children: [],
        }));
      }

      // Grouped by role — name nodes have no children (description shown on click)
      return Array.from(grouped.entries()).map(([role, members], gi) => ({
        id: `role-${gi}`,
        label: role,
        description: `${role} in this case`,
        children: members.map((m, mi) => ({
          id: `party-${gi}-${mi}`,
          label: m.name,
          description: m.description,
          children: [],
        })),
      }));
    })();

    // Laws & Jurisprudence — from AI sources if available, else infer from case notes/name
    const latestAiMessage = [...messages].reverse().find((m) => m.sender === "ai" && m.sources && m.sources.length > 0);
    const caseText = (activeCase.case_name || "") + " " + (activeCase.notes || "");

    const inferredLaws = (() => {
      const laws: { label: string; description: string }[] = [];
      if (/estafa|misappropriation|swindling/i.test(caseText))
        laws.push({ label: "Art. 315, Revised Penal Code", description: "Estafa — fraudulent misappropriation or deceit causing damage." });
      if (/bp\s*22|bounced check|bouncing check|worthless check/i.test(caseText))
        laws.push({ label: "B.P. 22 (Anti-Bounced Checks Law)", description: "Penalizes issuance of checks without sufficient funds." });
      if (/murder|homicide/i.test(caseText))
        laws.push({ label: "Art. 248/249, Revised Penal Code", description: "Murder or Homicide — unlawful killing with or without qualifying circumstances." });
      if (/theft|robbery/i.test(caseText))
        laws.push({ label: "Art. 308/294, Revised Penal Code", description: "Theft or Robbery — taking of property with or without force/intimidation." });
      if (/rape|sexual assault/i.test(caseText))
        laws.push({ label: "R.A. 8353 (Anti-Rape Law)", description: "Penalizes rape and sexual assault." });
      if (/drug|illegal substance|shabu|marijuana/i.test(caseText))
        laws.push({ label: "R.A. 9165 (Comprehensive Dangerous Drugs Act)", description: "Governs illegal drug offenses and penalties." });
      if (/libel|defamation|slander/i.test(caseText))
        laws.push({ label: "Art. 353, Revised Penal Code", description: "Libel — public imputation of a crime or vice causing dishonor." });
      if (/contract|breach|obligation/i.test(caseText))
        laws.push({ label: "Civil Code of the Philippines", description: "Governs obligations, contracts, and civil liability." });
      if (/annulment|nullity|marriage/i.test(caseText))
        laws.push({ label: "Family Code of the Philippines", description: "Governs marriage, annulment, legal separation, and family relations." });
      if (/labor|dismissal|illegal termination|employee/i.test(caseText))
        laws.push({ label: "Labor Code of the Philippines", description: "Governs employment, termination, and labor disputes." });
      return laws;
    })();

    // Law sub-details: specific charge + key legal elements from the case context
    const LAW_DETAILS: Record<string, { charge: string; elements: string[] }> = {
      estafa: {
        charge: "Estafa / Swindling",
        elements: ["Fraudulent misrepresentation", "Deceit causing damage", "Element: Intent to defraud"],
      },
      "bp 22": {
        charge: "Bounced Checks Offense",
        elements: ["Checks issued without sufficient funds", "Presumption of fraudulent intent", "Criminal & civil liability"],
      },
      murder: { charge: "Murder", elements: ["Unlawful killing", "Qualifying circumstances", "Treachery or evident premeditation"] },
      homicide: { charge: "Homicide", elements: ["Unlawful killing without qualifying circumstances"] },
      theft: { charge: "Theft", elements: ["Taking without force/intimidation", "Personal property of another"] },
      robbery: { charge: "Robbery", elements: ["Taking with force or intimidation", "Against the person"] },
      libel: { charge: "Libel / Defamation", elements: ["Public imputation", "Malice", "Causing dishonor or contempt"] },
      civil: { charge: "Civil Liability", elements: ["Breach of obligation", "Damages", "Contractual or delictual"] },
      annulment: { charge: "Annulment / Nullity", elements: ["Void or voidable marriage grounds", "Family Code provisions"] },
      labor: { charge: "Labor Dispute", elements: ["Illegal dismissal", "Labor Code violations", "Reinstatement / back wages"] },
    };

    const buildLawChildren = (lawLabel: string): any[] => {
      const k = lawLabel.toLowerCase();
      // Explicit matching by article number or keyword
      let detail: { charge: string; elements: string[] } | undefined;
      if (/315|estafa|swindling|misappropriation/.test(k)) detail = LAW_DETAILS["estafa"];
      else if (/bp\s*22|batas\s+pambansa|bounced|worthless\s+check/.test(k)) detail = LAW_DETAILS["bp 22"];
      else if (/248|249|murder|homicide/.test(k)) detail = LAW_DETAILS["murder"];
      else if (/308|294|theft|robbery/.test(k)) detail = LAW_DETAILS["theft"];
      else if (/353|libel|defamation|slander/.test(k)) detail = LAW_DETAILS["libel"];
      else if (/civil\s+code|breach|contract|obligation/.test(k)) detail = LAW_DETAILS["civil"];
      else if (/family\s+code|annulment|nullity|marriage/.test(k)) detail = LAW_DETAILS["annulment"];
      else if (/labor\s+code|dismissal|termination/.test(k)) detail = LAW_DETAILS["labor"];
      if (!detail) return [];
      return [
        { id: `law-charge`, label: detail.charge, description: `Applicable charge: ${detail.charge}`, children: [] },
        ...detail.elements.map((el, ei) => ({
          id: `law-el-${ei}`, label: el, description: "", children: [],
        })),
      ];
    };

    // Always use inferredLaws as primary source — they have proper labels and known structure.
    // AI sources may have inconsistent labels (e.g. "Philippine law Article 315") so we only
    // use them to supplement laws not already inferred from the case text.
    const lawNodes = inferredLaws.length > 0
      ? inferredLaws.map((l, i) => ({
        id: `law-${i}`,
        label: l.label,
        description: l.description,
        children: buildLawChildren(l.label),
      }))
      : latestAiMessage?.sources && latestAiMessage.sources.length > 0
        ? latestAiMessage.sources.slice(0, 4).map((s: any, i: number) => ({
          id: `law-${i}`,
          label: (s.reference || s.title || "Statute").slice(0, 50),
          description: s.description || "",
          children: buildLawChildren(s.reference || s.title || ""),
        }))
        : [{ id: "law-empty", label: "Ask AI for legal basis", description: "Send a message to get applicable laws.", children: [] }];

    // Strategic Steps — only show date as child if present; description shown on click
    const strategyNodes = activeTimeline
      .filter((t: any) => t.title !== "Case Created")
      .slice(0, 6)
      .map((t: any, i: number) => {
        const label = (t.title || "Step").slice(0, 50);
        const fullDesc = t.description || t.title || "";
        // Only show description if it adds info beyond the label
        const description = fullDesc.replace(/\.+$/, "").trim() === label.replace(/\.+$/, "").trim()
          ? ""
          : fullDesc;
        return {
          id: `step-${i}`,
          label,
          description,
          children: t.date
            ? [{ id: `step-${i}-date`, label: `Deadline: ${t.date}`, description: `Target date: ${t.date}`, children: [] }]
            : [],
        };
      });

    // Facts — grouped into themes: amounts/financial, documents/evidence, events/actions
    const notesForFacts = activeCase.notes || "";
    const summarySection = notesForFacts.match(/case\s+summary[\s\S]*?(?=\n[A-Z]{2,}|\n{3,}|CLIENT|ATTORNEY|$)/i)?.[0] || notesForFacts;
    const allSentences = summarySection.replace(/CASE SUMMARY/gi, "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 15);

    const factGroups = [
      {
        id: "fg-financial", label: "Financial Matters",
        re: /php\s*[\d,]+|peso|amount|payment|fund|money|invest|capital|profit|loss|fee/i,
      },
      {
        id: "fg-evidence", label: "Evidence & Documents",
        re: /moa|memorandum|agreement|contract|check|receipt|document|record|signed|issued|bank|text|email|communication/i,
      },
      {
        id: "fg-events", label: "Key Events",
        re: /allege|defraud|misrepresent|dishonor|invest|convince|persuad|broker|project|scheme|approach/i,
      },
    ];

    const factNodes = (() => {
      const groups = factGroups.map((g) => ({
        id: g.id,
        label: g.label,
        description: `${g.label} relevant to this case`,
        children: allSentences
          .filter((s) => g.re.test(s))
          .slice(0, 3)
          .map((s, si) => {
            const label = s.length > 52 ? s.substring(0, 52) + "..." : s;
            return {
              id: `${g.id}-${si}`,
              label,
              // Only set description if it adds beyond the label
              description: s.length > 52 ? s : "",
              children: [],
            };
          }),
      })).filter((g) => g.children.length > 0);

      return groups.length > 0
        ? groups
        : allSentences.slice(0, 4).map((s, i) => ({
          id: `fact-${i}`, label: s.length > 55 ? s.substring(0, 52) + "..." : s, description: s, children: [],
        }));
    })();

    activeMindMap = {
      id: "root",
      label: activeCase.case_name || "Case Analysis",
      children: [
        {
          id: "c1",
          label: "Key Parties",
          description: "People involved in this case.",
          children: partyNodes.length > 0
            ? partyNodes
            : [{ id: "party-empty", label: "No parties specified", description: "Add party details when creating the case.", children: [] }],
        },
        {
          id: "c2",
          label: "Legal Basis",
          description: "Applicable laws and statutes.",
          children: lawNodes,
        },
        {
          id: "c3",
          label: "Strategic Steps",
          description: "Recommended action steps from AI analysis.",
          children: strategyNodes,
        },
        {
          id: "c4",
          label: "Facts",
          description: "Key facts and notes from the case.",
          children: factNodes,
        },
      ],
    };
  }

  // If no mind map but have files, create a basic one
  if (!activeMindMap && briefcaseAttachments.length > 0) {
    activeMindMap = {
      id: "root",
      label: "Document Analysis",
      children: [
        { id: 'legal-vault', label: 'Legal Evidence Vault', children: vaultNodes }
      ]
    };
  }

  // Add vault to existing mind map if files exist
  if (activeMindMap && briefcaseAttachments.length > 0) {
    activeMindMap = JSON.parse(JSON.stringify(activeMindMap));

    const normalizeName = (value: any) => {
      const s = typeof value === "string" ? value : "";
      // Strip directories and normalise case for more reliable matching.
      return s.toLowerCase().trim().replace(/^.*[\\/]/, "");
    };

    const getExt = (filename: any) => {
      const name = normalizeName(filename);
      const m = name.match(/\.([a-z0-9]{1,10})$/i);
      return m ? m[1].toLowerCase() : "";
    };

    // Sync evidence to tree
    const syncEvidenceToTree = (node: any) => {
      const nodeLabel = (node.label || "").toLowerCase();
      const nodeDesc = (node.description || "").toLowerCase();

      // Heal existing media
      if (node.media) {
        node.media = node.media.map((m: any) => {
          const mNameNorm = normalizeName(m?.name);
          const mUrl = m?.url;
          const mExt = getExt(m?.name);
          const isBlobStale = typeof mUrl === "string" && mUrl.startsWith("blob:");

          const matches = briefcaseAttachments.filter((att: any) => {
            const attUrl = att?.url;
            const attNameNorm = normalizeName(att?.name);
            if (attUrl && attUrl === mUrl) return true;
            if (mNameNorm && attNameNorm && attNameNorm === mNameNorm) return true;
            if (isBlobStale && mExt && attNameNorm && getExt(att?.name) === mExt) return true;
            return false;
          });

          if (!matches.length) return m;

          const bestAtt = matches.find((a: any) => a?.url && !a.url.startsWith("blob:")) || matches[0];
          if (!bestAtt?.url) return m;

          return {
            ...m,
            url: bestAtt.url,
            name: bestAtt.name || m.name,
          };
        });
      }

      // Discover new evidence
      const matchedAtt = briefcaseAttachments.find((att: any) => {
        const name = (att.name || "").toLowerCase();
        const summary = (att.ai_summary || "").toLowerCase();
        const words = name.split(/[._\s-]/).filter((w: string) => w.length > 3);

        return words.some((word: string) => nodeLabel.includes(word)) ||
          summary.split(' ').slice(0, 10).some((word: string) => word.length > 4 && nodeLabel.includes(word)) ||
          nodeLabel.includes(name);
      });

      if (matchedAtt) {
        node.media = node.media || [];
        const matchedType = matchedAtt.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          ? "image"
          : matchedAtt.name?.match(/\.(mp3|wav|ogg|m4a)$/i)
            ? "audio"
            : "file";

        const matchedNameNorm = normalizeName(matchedAtt.name);
        const existingIdx = node.media.findIndex((m: any) => {
          const mNameNorm = normalizeName(m?.name);
          return (matchedNameNorm && mNameNorm === matchedNameNorm) || m?.url === matchedAtt.url;
        });

        if (existingIdx >= 0) {
          node.media[existingIdx] = {
            ...node.media[existingIdx],
            type: matchedType,
            name: matchedAtt.name,
            url: matchedAtt.url,
          };
        } else {
          node.media.push({
            type: matchedType,
            name: matchedAtt.name,
            url: matchedAtt.url,
          });
        }
      }
      if (node.children) node.children.forEach(syncEvidenceToTree);
    };

    syncEvidenceToTree(activeMindMap);

    activeMindMap.children = activeMindMap.children || [];
    let vault = activeMindMap.children.find((c: any) =>
      c.label && (c.label.toLowerCase().includes('vault') || c.label.toLowerCase().includes('evidence'))
    );

    if (vault) {
      vault.children = vault.children.filter((c: any) => !c.id?.includes('-empty'));
      const seen = new Set(vault.children.map((c: any) => (c.label || "").toLowerCase()));
      vaultNodes.forEach(n => {
        if (!seen.has(n.label.toLowerCase())) vault.children.push(n);
      });
    } else {
      activeMindMap.children.push({ id: 'legal-vault', label: 'Legal Evidence Vault', children: vaultNodes });
    }
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
      isEmailPreviewOpen,
      setIsEmailPreviewOpen,
      handleSendEmail,
      handleConfirmSendEmail,
    },
    scheduleState: {
      scheduleType,
      setScheduleType,
      scheduleDateTime,
      setScheduleDateTime,
      scheduleEmails,
      setScheduleEmails,
      scheduleNotes,
      setScheduleNotes,
      isScheduling,
      scheduleStatus,
      handleScheduleEvent,
      handleFinalizeSchedule,
      conflictWarning,
      setConflictWarning,
      draftedEventId,
      isSchedulePreviewOpen,
      setIsSchedulePreviewOpen,
      scheduleError,
      setScheduleError,
      getMinDateTime,
    },
    derivedData: {
      activeTimeline,
      activeMindMap,
    },
  };
}
