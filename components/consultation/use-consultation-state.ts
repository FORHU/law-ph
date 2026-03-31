import { useState, useRef, RefObject } from "react";
import { Message } from "@/components/conversation-provider/conversation-context";
import { CaseData } from "@/types";

interface UseConsultationStateProps {
  messages: Message[];
  activeCase?: CaseData | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function useConsultationState({
  messages,
  activeCase,
  scrollContainerRef,
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
    if (!scheduleEmail || !scheduleDateTime) return;

    setIsScheduling(true);
    setScheduleStatus("idle");

    try {
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
        setScheduleStatus("success");
        setTimeout(() => setScheduleStatus("idle"), 3000);
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
