const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'consultation.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the line that starts the logic:
const startIdx = lines.findIndex(l => l.includes('const prevMessagesLengthRef = useRef(messages.length);'));
// Find the end of handleTabChange string:
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes('const onSendMessage = (msg: string, file?: File | null, skipAIResponse?: boolean) => {') ||
      lines[i].includes('const handleDocumentAnalyzed = (data: any) => {') ||
      (lines[i] === '  };' && lines[i+2] && lines[i+2].includes('const onSendMessage ='))) {
    endIdx = lines[i].includes('const onSendMessage') ? i - 1 : i;
    // ensure we stop immediately before `onSendMessage` is declared (minus empty lines)
    while (lines[endIdx].trim() === '') endIdx--;
    break;
  }
}

console.log('Replacing from line', startIdx, 'to', endIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find bounds");
  process.exit(1);
}

const replacementCode = `
  // Separated Logic
  const { globalTab, setGlobalTab, handleTabChange, emailState, scheduleState, derivedData } = useConsultationState({
    messages, activeCase, scrollContainerRef
  });

  useConsultationEffects({
    messages, isLoading, router, currentConsultationId, activeConversationId, scrollContainerRef, handleSendMessage
  });

  const { activeTimeline, activeMindMap } = derivedData;
  const { emailTo, setEmailTo, emailSubject, setEmailSubject, emailBody, setEmailBody, isSendingEmail, emailSentStatus, handleSendEmail } = emailState;
  const { scheduleType, setScheduleType, scheduleDateTime, setScheduleDateTime, scheduleEmail, setScheduleEmail, scheduleNotes, setScheduleNotes, isScheduling, scheduleStatus, handleScheduleEvent } = scheduleState;
`;

// Also need to inject imports at the top
const imports = `import { useConsultationState } from "./consultation/use-consultation-state";
import { useConsultationEffects } from "./consultation/use-consultation-effects";`;
const importIdx = lines.findIndex(l => l.includes('export default function Consultation()'));

lines.splice(importIdx, 0, imports, ''); // insert imports before the component
const newStartIdx = startIdx + 2; // lines shifted due to import insertion
const newEndIdx = endIdx + 2;

lines.splice(newStartIdx, newEndIdx - newStartIdx + 1, replacementCode);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Successfully refactored consultation.tsx');
