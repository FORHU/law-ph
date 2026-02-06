
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Scale, 
  Send, 
  AlertTriangle,
  User
} from 'lucide-react';
import { AppSidebar } from './app-sidebar';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
}

interface ConsultationSession {
  id: number;
  title: string;
  subtitle: string;
  messages: Message[];
}

export default function Consultation() {
  const router = useRouter();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([]);

  const quickQuestions = [
    "What are my tenant rights?",
    "How do I file a small claims case?",
    "Explain employment contract basics",
    "What is breach of contract?"
  ];

  // Load consultations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ilovelawyer_consultations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentConsultations(parsed);
      } catch (e) {
        console.error('Failed to parse consultations', e);
      }
    }
  }, []);

  // Save consultations to localStorage whenever they change
  useEffect(() => {
    if (recentConsultations.length > 0) {
      localStorage.setItem('ilovelawyer_consultations', JSON.stringify(recentConsultations));
    }
  }, [recentConsultations]);

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(consultation.messages);
    setCurrentConsultationId(consultation.id);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newMessage: Message = {
        id: Date.now(),
        text: inputMessage,
        sender: 'user' as const,
        time: timestamp
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Update or create in recent list
      const sessionTitle = currentConsultationId 
        ? recentConsultations.find(c => c.id === currentConsultationId)?.title || inputMessage.substring(0, 30) + (inputMessage.length > 30 ? '...' : '')
        : inputMessage.substring(0, 30) + (inputMessage.length > 30 ? '...' : '');

      const sessionId = currentConsultationId || Date.now();
      
      const sessionData: ConsultationSession = {
        id: sessionId,
        title: sessionTitle,
        subtitle: `Session_${sessionId.toString().slice(-5)}...`,
        messages: updatedMessages
      };

      if (!currentConsultationId) {
        setCurrentConsultationId(sessionId);
        setRecentConsultations([sessionData, ...recentConsultations]);
      } else {
        setRecentConsultations(recentConsultations.map(c => c.id === sessionId ? sessionData : c));
      }

      setInputMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now() + 1,
          text: "I'm processing your legal question. In a production environment, this would be connected to the ilovelawyer AI system to provide accurate legal information based on Philippine law.",
          sender: 'ai' as const,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
        
        const messagesWithAi = [...updatedMessages, aiResponse];
        setMessages(messagesWithAi);
        
        // Update session with AI message
        const finalSessionData = { ...sessionData, messages: messagesWithAi };
        setRecentConsultations(prev => prev.map(c => c.id === sessionId ? finalSessionData : c));
      }, 1000);
    }
  };

  const handleNewConsultation = () => {
    setMessages([]);
    setCurrentConsultationId(null);
  };

  const sidebarRecentItems = recentConsultations.map(c => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    onClick: () => handleLoadConsultation(c)
  }));

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background Image with Overlay - Fixed Position */}
      <div className="fixed inset-0 z-0">
        <motion.img 
          src="https://images.unsplash.com/photo-1701267148058-9159d6642f79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWR5JTIwanVzdGljZSUyMHN0YXR1ZSUyMGRyYW1hdGljJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzcwMTcyODAxfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-30 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/70 to-[#1A1A1A]/95"></div>
      </div>

      <AppSidebar 
        activePage="chat"
        recentItems={sidebarRecentItems}
        onNewItem={handleNewConsultation}
        newItemLabel="New Consultation"
        showWorkspace={messages.length > 0}
        workspaceTitle="Current Consultation"
        workspaceSubtitle={currentConsultationId ? `Session_${currentConsultationId.toString().slice(-5)}...` : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="relative z-10 border-b border-[#8B4564]/20 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')}
                className="p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-300" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8B4564]/20 rounded-lg">
                  <Scale size={20} className="text-[#8B4564]" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Legal Consultation</h1>
                  <p className="text-xs text-gray-400">AI-powered legal assistance</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#8B4564]/20 border border-[#8B4564]/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-300">ENCRYPTED</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <>
                <div className="flex items-start gap-3 mb-8">
                  <div className="p-2 bg-[#8B4564]/20 rounded-lg mt-1 flex-shrink-0">
                    <Scale size={18} className="text-[#8B4564]" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-2xl rounded-tl-sm p-5">
                      <p className="text-gray-200 leading-relaxed">
                        Hello! I'm your ilovelawyer workspace assistant. You can ask me legal questions, find nearby legal aid, or upload a document for me to review. How can I help you today?
                      </p>
                      <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                        <span>02:43 PM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Questions */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 text-sm text-[#8B4564]">
                    <Scale size={16} />
                    <span>Quick questions to get started</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(question)}
                        className="px-5 py-3 bg-[#2A2A2A]/50 backdrop-blur border border-[#8B4564]/30 rounded-lg hover:bg-[#2A2A2A]/70 hover:border-[#8B4564]/50 transition-all text-left text-sm text-gray-300"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {message.sender === 'ai' && (
                    <div className="p-2 bg-[#8B4564]/20 rounded-lg mt-1 flex-shrink-0">
                      <Scale size={18} className="text-[#8B4564]" />
                    </div>
                  )}
                  {message.sender === 'user' && (
                    <div className="p-2 bg-[#8B4564]/20 rounded-full mt-1 flex-shrink-0">
                      <User size={18} className="text-white" />
                    </div>
                  )}
                  <div className={`flex-1 ${message.sender === 'user' ? 'max-w-[85%] ml-auto' : 'max-w-[85%]'}`}>
                    <div className={`backdrop-blur border rounded-2xl p-5 ${
                      message.sender === 'user' 
                        ? 'bg-[#8B4564]/20 border-[#8B4564]/40 rounded-tr-sm' 
                        : 'bg-[#2A2A2A]/70 border-[#8B4564]/30 rounded-tl-sm'
                    }`}>
                      <div className="text-gray-200 leading-relaxed">
                        {message.sender === 'ai' ? (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            {message.text.split("").map((char, index) => (
                              <motion.span
                                key={index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: 0.01,
                                  delay: index * 0.02,
                                  ease: "linear",
                                }}
                              >
                                {char}
                              </motion.span>
                            ))}
                          </motion.span>
                        ) : (
                          message.text
                        )}
                      </div>
                      <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                        <span>{message.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="relative z-10 border-t border-[#8B4564]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
          {/* Warning Banner */}
          <div className="px-6 py-2 bg-gradient-to-r from-[#8B4564]/10 to-transparent border-b border-[#8B4564]/20">
            <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-[#8B4564]">
              <AlertTriangle size={14} />
              <span>NOTE: IMAGE ANALYSIS IS CURRENTLY LIMITED IN THIS MODE</span>
            </div>
          </div>

          {/* Input Box */}
          <div className="px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask ilovelawyer regarding legal matters..."
                    rows={1}
                    className="w-full px-5 py-3.5 bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-[#8B4564]/60 transition-colors"
                    style={{ minHeight: '56px', maxHeight: '120px' }}
                  />
                </div>
                <button className="h-14 w-14 bg-gradient-to-r from-[#8B4564] to-[#8B4564] rounded-xl hover:from-[#9D5373] hover:to-[#9D5373] transition-all flex items-center justify-center flex-shrink-0 mb-1.5" onClick={handleSendMessage}>
                  <Send size={20} className="text-white" />
                </button>
              </div>
              
              {/* Disclaimer */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  AI can make mistakes. Verify important legal information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
