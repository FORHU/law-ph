export const MODAL_STYLES = {
  overlay: "fixed inset-0 z-[100] flex items-center justify-center p-4",
  backdrop: "absolute inset-0 bg-black/70 backdrop-blur-md",
  container: "relative w-full max-w-2xl bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]",
  content: "p-5 md:p-6 overflow-y-auto custom-scrollbar",
  input: "w-full px-4 py-2.5 bg-black/40 border border-[#722f37]/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#e9c176]/50 transition-all text-[13px] font-body",
  textarea: "w-full px-4 py-3 bg-black/40 border border-[#722f37]/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#e9c176]/50 transition-all resize-none text-[13px] font-body",
  label: "block text-[12px] font-bold text-[#e9c176]/80 mb-1.5 uppercase tracking-widest font-sans",
  buttonCancel: "flex-1 px-4 py-2.5 border border-[#722f37]/30 rounded-xl text-gray-400 hover:bg-white/5 transition-all font-medium text-[13px]",
  buttonSubmit: "flex-[1.5] px-4 py-2.5 bg-[#722f37] text-white rounded-xl hover:bg-[#8B3A44] transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-[13px] uppercase tracking-wider"
};

export const STRINGS = {
  title: "Create New Case",
  description: "Fill in the case details below. Use the microphone to record or transcribe conversations.",
  caseNameLabel: "Case Name",
  caseNamePlaceholder: "e.g., Smith vs. Jones Property Dispute",
  partyLabel: "Party Involved",
  partyPlaceholder: "e.g., John Smith",
  partyHint: "Press Enter to add another party",
  notesLabel: "Transcript / Notes",
  notesPlaceholder: "Type notes or use the microphone button to record a conversation...",
  summarizeBtn: "Summarize with AI",
  originalBtn: "Show Original",
  summaryBtn: "Show Summary",
  createBtn: "Create Case",
  cancelBtn: "Cancel",
  transcriptionActive: "Stop Transcribing",
  transcriptionInactive: "Live Transcribe",
  voiceActive: "Stop Voice",
  voiceInactive: "Record Voice",
  recordingLabel: "Voice Recording",
  recordingStatus: "Ready to listen",
  recordingMultiple: "Recordings"
};
