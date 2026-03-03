'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, History, GitGraph, Mail, Calendar, Sparkles, Briefcase, PenTool } from 'lucide-react';
import { AppSidebar } from './app-sidebar';
import { CHAT_SENDER, STORAGE_KEYS, ASSETS } from '@/lib/constants';
import { Session } from '@supabase/supabase-js';
import { Conversation } from '@/types';

import { useAuth } from '@/components/auth/auth-provider';
import { useConversations } from '@/components/conversation-provider/conversation-context';

import { PageLayout } from '@/components/ui/page-layout';

// Sub-components
import { ConsultationHeader } from './consultation/consultation-header';
import { QuickQuestions } from './consultation/quick-questions';
import { MessageList } from './consultation/message-list';
import { ChatInput } from './consultation/chat-input';
import { SourceDetailSidebar } from './consultation/source-detail-sidebar';
import { NoteSidebar } from './consultation/note-sidebar';
import { MindMap } from './consultation/mind-map';

export default function Consultation() {
  const [inputMessage, setInputMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const activeConversationId = (params?.conversationId || params?.id) as string | undefined;
  const { loggedIn } = useAuth();
 
  useEffect(() => {
    if (!loggedIn) {
      router.push('/auth/login');
    }
  }, [loggedIn, router]);

  const {
    messages,
    isLoading,
    recentConsultations,
    currentConsultationId,
    handleLoadConsultation,
    handleNewConsultation: coreHandleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation,
    handleSendMessage,
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
    updateMessage,
    cases
  } = useConversations();

  const activeCase = activeConversationId ? cases.find(c => c.id === activeConversationId) : null;
  const isCaseMode = !!activeCase;

  const handleGetCaseInsight = () => {
    if (activeCase) {
      const prompt = `[Case Analysis Request] I have opened a new case. Please provide your professional insight, a strategic plan, and a proposed timeline of actionable steps. Do not repeat the facts or notes in your insight, just provide pure strategy and advice.

Case Name: ${activeCase.case_name}
Party Involved: ${activeCase.party_involved || 'N/A'}
Notes/Transcript: ${activeCase.notes || 'None provided'}`;
      
      handleSendMessage(prompt);
    }
  };

  const handleViewCaseDetails = () => {
    if (activeCase) {
      openCaseDetail({
        caseNumber: activeCase.id.toString(),
        title: activeCase.case_name,
        description: `Party Involved: ${activeCase.party_involved || 'N/A'}\n\nNotes:\n${activeCase.notes || 'None provided'}`,
        isLocalCase: true
      } as any);
    }
  };

  const [isNoteSidebarOpen, setIsNoteSidebarOpen] = useState(false);
  const [selectedNoteMessage, setSelectedNoteMessage] = useState<{id: string | number, text: string} | null>(null);

  console.log("[Consultation] Render. Messages:", messages.length, "RecentItems:", recentConsultations.length, "ActiveID:", activeConversationId);


  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom only when new messages arrive or AI is streaming
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (messages.length > prevMessagesLengthRef.current || isLoading) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isLoading]);

  const lastIdRef = useRef<string | null>(null);

  // Sync state to URL for new consultations
  useEffect(() => {
    // Only redirect if we have a real UUID (string) and messages, and we aren't already on that URL
    const shouldRedirect = currentConsultationId && 
                          typeof currentConsultationId === 'string' && 
                          !activeConversationId && 
                          messages.length > 0 &&
                          currentConsultationId !== lastIdRef.current;

    if (shouldRedirect) {
      lastIdRef.current = currentConsultationId as string;
      router.push(`/consultation/${currentConsultationId}`);
    }
  }, [currentConsultationId, activeConversationId, messages.length, router]);

  // Handle Legal Wizard Data
  useEffect(() => {
    const wizardDataStr = sessionStorage.getItem('legal_wizard_data');
    
    // Check if we have data, no messages, no active consultation, AND checking isLoading to ensure socket is likely ready
    if (wizardDataStr && messages.length === 0 && !currentConsultationId && !isLoading) {
      try {
        const data = JSON.parse(wizardDataStr);
        
        // Construct a more natural "User" message
        // Handle "Other" vs specific categories text
        const issueText = data.specificIssue ? `specifically regarding ${data.specificIssue}` : '';
        const descriptionText = data.description ? `Here are the details: "${data.description}"` : '';
        
        const prompt = `I am a ${data.userType} dealing with a ${data.legalArea} matter ${issueText}. ${descriptionText} ${data.consultationHistory}. My primary goal is to ${data.primaryGoal}. The situation is ${data.urgency}.`;
        
        // Store wizard data in sessionStorage with a special flag for title generation
        sessionStorage.setItem('wizard_title_data', JSON.stringify({
          userType: data.userType,
          legalArea: data.legalArea,
          specificIssue: data.specificIssue || data.description?.substring(0, 30)
        }));
        
        // Small delay to ensure socket/auth is stable
        const timer = setTimeout(() => {
            handleSendMessage(prompt);
            sessionStorage.removeItem('legal_wizard_data');
        }, 500);
        
        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Failed to parse wizard data", e);
      }
    }
  }, [messages.length, currentConsultationId, handleSendMessage, isLoading]);

  const [globalTab, setGlobalTab] = useState<'chat' | 'timeline' | 'mindmap' | 'email' | 'schedule'>('chat');

  const latestTimelineMessage = [...messages].reverse().find(m => m.timeline && m.timeline.length > 0);
  const activeTimeline = latestTimelineMessage?.timeline || [];

  const onSendMessage = () => {
    if (inputMessage.trim()) {
      handleSendMessage(inputMessage);
      setInputMessage('');
      setGlobalTab('chat'); // Switch back to chat on new message
    }
  };

  /* sidebarRecentItems update to include onRename */
  const sidebarRecentItems = recentConsultations.map((c: any) => ({
    id: c.id,
    title: c.title,
    onClick: () => {
      setGlobalTab('chat');
      router.push(`/consultation/${c.id}`);
    },
    onRemove: async () => {
      console.log("[Consultation] Removing item in sidebar:", c.id);
      const isDeletingActive = c.id === activeConversationId || c.id?.toString() === currentConsultationId?.toString();
      
      // If we are deleting the active one, push BEFORE awaiting to clear the URL ID immediately
      if (isDeletingActive) {
        console.log("[Consultation] Deleting active item, pushing to /consultation");
        router.push('/consultation');
        setGlobalTab('chat');
      }
      
      await handleRemoveConsultation(c.id);
    },
    onRename: (newTitle: string) => handleRenameConsultation(c.id, newTitle)
  }));

  const handleNewConsultation = () => {
    // Clear state and reset redirect ref to allow fresh start
    lastIdRef.current = null;
    coreHandleNewConsultation();
    setGlobalTab('chat');
    // Navigating to /consultation will trigger the sync logic but with clean state
    router.push('/consultation', { scroll: false });
  };

  // Find active conversation for title
  const activeConversation = recentConsultations.find((c: any) => c.id === currentConsultationId) || 
                             (activeConversationId ? recentConsultations.find((c: any) => c.id === activeConversationId) : null);
  
  let headerTitle = activeConversation?.title || "New Consultation";
  if (isCaseMode && activeCase) {
    headerTitle = activeCase.case_name;
  }
  const isDefaultTitle = !activeConversation && !isCaseMode;

  return (
    <PageLayout
      activePage="chat"
      title={headerTitle}
      subtitle={undefined}
      onNewItem={handleNewConsultation}
      newItemLabel="New Consultation"
      recentItems={sidebarRecentItems}
      isEditable={!isDefaultTitle}
      onTitleChange={(newTitle) => {
        if (currentConsultationId) {
          handleRenameConsultation(currentConsultationId, newTitle);
        }
      }}
      headerActions={(
        <div className="flex items-center gap-2">
          {isCaseMode && activeCase && messages.length > 0 && (
            <button 
              onClick={handleViewCaseDetails} 
              className="text-[#E0A7C2] hover:text-white flex items-center gap-1.5 transition-colors text-xs font-semibold px-3 py-1.5 bg-[#8B4564]/20 hover:bg-[#8B4564]/50 border border-[#8B4564]/30 rounded-full"
            >
              <Briefcase size={13} /> View Case Details
            </button>
          )}
        </div>
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 relative pb-6 md:pb-10">
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-8 scroll-smooth landscape:py-2"
        >
          <div className={`max-w-4xl mx-auto ${messages.length === 0 ? 'h-full flex flex-col justify-start pt-4 md:pt-8' : ''}`}>
            <AnimatePresence mode="wait">
              {messages.length === 0 && (
                <motion.div
                  key="quick-questions-top"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8"
                >
                  {isCaseMode && activeCase ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                      <div className="bg-[#8B4564]/10 p-4 rounded-full">
                        <MessageSquare className="w-8 h-8 text-[#E0A7C2]" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Case: {activeCase.case_name}</h2>
                        <p className="text-gray-400 max-w-md mx-auto">
                          Ready to analyze this case. The AI can review the parties involved and notes to provide an initial strategy and timeline.
                        </p>
                      </div>
                      <button 
                        onClick={handleGetCaseInsight}
                        className="bg-[#8B4564] hover:bg-[#7a3c58] text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-[#8B4564]/20 flex items-center gap-2"
                      >
                        <Sparkles size={18} />
                        Get AI Insight
                      </button>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <div className="inline-flex p-5 bg-[#8B4564]/10 rounded-full mb-4">
                        <MessageSquare size={32} className="text-[#E0A7C2]" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Start a New Consultation</h2>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Describe your legal situation and get immediate AI-powered guidance. 
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {globalTab === 'chat' ? (
              <MessageList
                messages={messages.map(m => {
                  if (m.sender === CHAT_SENDER.USER && m.text.startsWith('[Case Analysis Request]')) {
                    return { ...m, text: 'Requesting AI Case Analysis...' };
                  }
                  return m;
                })}
                onDelete={handleDeleteMessage}
                onSourceClick={openSourceDetail}
                onCaseClick={openCaseDetail}
                onUpdateMessage={updateMessage}
                onOpenNote={(msgId, msgText) => {
                  setSelectedNoteMessage({ id: msgId, text: msgText });
                  setIsNoteSidebarOpen(true);
                  setIsSidebarOpen(false); // Close left panel
                }}
              />
            ) : globalTab === 'timeline' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTimeline.length > 0 ? (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <GitGraph className="text-[#E0A7C2]" /> Case Timeline
                    </h2>
                    <div className="relative border-l-2 border-[#8B4564]/30 ml-[4.5rem] md:ml-[6rem] space-y-8 pb-8">
                      {(() => {
                        let lastDate = "";
                        return activeTimeline.map((item: any, i: number) => {
                          const showDate = item.date && item.date !== lastDate;
                          if (item.date) lastDate = item.date;
                          
                          return (
                            <div key={i} className="relative pl-6 md:pl-8">
                              {showDate && (
                                <div className="absolute -left-[4.5rem] md:-left-[6rem] top-1.5 w-[3.5rem] md:w-[5rem] text-right pr-2 md:pr-4">
                                  <span className="text-[10px] md:text-[11px] font-bold text-[#E0A7C2] block leading-tight">
                                    {item.date}
                                  </span>
                                </div>
                              )}
                              
                              <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[#1A1A1A] ${
                                item.status === 'completed' ? 'bg-[#10B981]' : 
                                item.status === 'active' ? 'bg-[#F59E0B]' : 'bg-[#8B4564]/50'
                              }`} />
                              <div className={`bg-[#2A2A2A] p-5 rounded-xl border border-white/5 shadow-md ${
                                item.status === 'active' ? 'ring-1 ring-[#F59E0B]/50' : ''
                              }`}>
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-semibold text-base md:text-lg text-white">{item.title}</h3>
                                  <span className={`text-[10px] md:text-xs px-2 py-1 flex-shrink-0 ml-2 rounded-full uppercase tracking-wider font-semibold ${
                                    item.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                                    item.status === 'active' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-gray-800 text-gray-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed mt-2">{item.description}</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="inline-flex p-5 bg-[#8B4564]/10 rounded-full mb-4">
                      <GitGraph size={32} className="text-[#E0A7C2]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Consultation Timeline</h2>
                    <p className="text-gray-400 max-w-md mx-auto">Chronological overview of the legal proceedings and evidence. Ask the AI to generate a plan to see it here.</p>
                  </div>
                )}
              </div>
            ) : globalTab === 'email' ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-2xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden w-full">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#E0A7C2]/10 text-[#E0A7C2] rounded-xl flex-shrink-0">
                        <Mail size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">Draft Email</h2>
                        <p className="text-xs md:text-sm text-gray-400">Share findings and case summaries.</p>
                      </div>
                    </div>
                    
                    <button className="flex items-center gap-2 bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] border border-white/5 text-gray-300 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-colors flex-shrink-0 relative group">
                      <span className="flex h-4 w-4 absolute -top-1.5 -right-1.5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#111111]">
                        1
                      </span>
                      <Mail size={16} /> <span className="hidden sm:inline">View</span> Inbox
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Auto-fill from AI Findings (Optional)</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all appearance-none cursor-pointer"
                        onChange={(e) => {
                          const ta = document.getElementById('email-message-body') as HTMLTextAreaElement;
                          if (ta) ta.value = e.target.value;
                        }}
                      >
                        <option value="">-- Select an AI finding to insert --</option>
                        {messages.filter(m => m.sender === 'ai' && m.text.length > 20).map((m, idx) => (
                          <option key={idx} value={m.text}>{m.text.substring(0, 60)}...</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center px-1 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                      </div>
                    </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">To</label>
                      <input type="email" placeholder="client@example.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Subject</label>
                      <input type="text" placeholder="Update on Case Findings" defaultValue={activeCase ? `Update on: ${activeCase.case_name}` : ""} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Message</label>
                      <textarea 
                        id="email-message-body"
                        rows={5}
                        placeholder="Hello, I am writing to share the latest AI findings regarding..." 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button className="bg-[#E0A7C2] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white transition-all flex items-center gap-2"
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const original = btn.innerHTML;
                          btn.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...</span>';
                          setTimeout(() => {
                            btn.innerHTML = '<span class="flex items-center gap-2"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Sent Successfully</span>';
                            btn.classList.add('!bg-green-500', '!text-white');
                            setTimeout(() => {
                              btn.innerHTML = original;
                              btn.classList.remove('!bg-green-500', '!text-white');
                            }, 3000);
                          }, 1500);
                        }}
                      >
                        <Mail size={16} /> Send Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : globalTab === 'schedule' ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-2xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative w-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#10B981]/10 text-[#10B981] rounded-xl flex-shrink-0">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">Schedule Event</h2>
                      <p className="text-xs md:text-sm text-gray-400">Book meetings, appointments, or hearings.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Event Type</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all appearance-none cursor-pointer">
                          <option>Meeting</option>
                          <option>Appointment</option>
                          <option>Hearing</option>
                          <option>Deposition</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Date & Time</label>
                        <input type="datetime-local" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all [color-scheme:dark]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Client Email</label>
                      <input type="email" placeholder="client@example.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all placeholder:text-gray-600" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Description / Notes</label>
                      <textarea 
                        rows={3}
                        placeholder="Discuss evidence strategy and finalize documentation..." 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all placeholder:text-gray-600 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button className="bg-[#10B981] text-black font-bold px-6 py-2.5 rounded-xl hover:bg-white transition-all flex items-center gap-2"
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const original = btn.innerHTML;
                          btn.innerHTML = 'Scheduling...';
                          setTimeout(() => {
                            btn.innerHTML = '✓ Scheduled';
                            btn.classList.add('!bg-white', '!text-[#10B981]');
                            setTimeout(() => {
                              btn.innerHTML = original;
                              btn.classList.remove('!bg-white', '!text-[#10B981]');
                            }, 3000);
                          }, 1500);
                        }}
                      >
                        <Calendar size={16} /> Schedule Event
                      </button>
                    </div>
                  </div>
                </div>
              </div>
             ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-4">
                 <MindMap rootTitle={activeCase ? activeCase.case_name : "Case Analysis"} />
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 relative z-10">
          <div className="h-6 mb-1">
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-gray-400"
              >
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>ilovelawyer is thinking...</span>
              </motion.div>
            )}
          </div>
        </div>

        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={onSendMessage}
          disabled={isLoading}
          activeTab={globalTab}
          onTabChange={setGlobalTab}
          hasMessages={messages.length > 0}
          isCaseMode={isCaseMode}
        />
      </div>
 
       {/* Source Detail Sidebar */}
      <SourceDetailSidebar
        isOpen={isDetailSidebarOpen}
        onClose={closeDetailSidebar}
        source={selectedSource || undefined}
        caseItem={selectedCase || undefined}
        context={detailContext}
      />

      {/* Note Sidebar Overlay */}
      <NoteSidebar
        isOpen={isNoteSidebarOpen}
        onClose={() => setIsNoteSidebarOpen(false)}
        messageText={selectedNoteMessage?.text}
        messageId={selectedNoteMessage?.id}
        onUpdateMessage={updateMessage}
        highlights={messages.find(m => m.id === selectedNoteMessage?.id)?.highlights}
      />
    </PageLayout>
  );
}
