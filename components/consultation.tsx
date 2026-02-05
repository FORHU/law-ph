import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Scale, 
  MessageSquare, 
  Send, 
  HelpCircle,
  FileText,
  LayoutDashboard,
  Plus,
  AlertTriangle,
  User
} from 'lucide-react';

export default function Consultation() {
  const router = useRouter();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: number; text: string; sender: 'user' | 'ai'; time: string }>>([]);
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(null);

  const quickQuestions = [
    "What are my tenant rights?",
    "How do I file a small claims case?",
    "Explain employment contract basics",
    "What is breach of contract?"
  ];

  const recentConsultations = [
    { 
      id: 1, 
      title: "Employment Law Query", 
      subtitle: "Session_43214...",
      messages: [
        { id: 1, text: "What are the legal requirements for terminating an employee in the Philippines?", sender: 'user' as const, time: "10:15 AM" },
        { id: 2, text: "Under Philippine labor law, specifically the Labor Code of the Philippines, there are two types of termination: for just cause and for authorized cause. For just cause termination (Article 297), valid grounds include serious misconduct, willful disobedience, gross and habitual neglect of duties, fraud, commission of a crime against the employer, and other analogous causes. For authorized cause termination (Article 298), grounds include installation of labor-saving devices, redundancy, retrenchment to prevent losses, and closure of business.", sender: 'ai' as const, time: "10:15 AM" },
        { id: 3, text: "What notice period is required?", sender: 'user' as const, time: "10:18 AM" },
        { id: 4, text: "For authorized cause terminations, the employer must serve a written notice to both the employee and the Department of Labor and Employment (DOLE) at least 30 days before the intended date of termination. For just cause terminations, a two-notice rule applies: first notice specifying the grounds for termination, giving the employee reasonable time to respond, and second notice informing the employee of the decision to terminate.", sender: 'ai' as const, time: "10:18 AM" }
      ]
    },
    { 
      id: 2, 
      title: "Contract Review", 
      subtitle: "",
      messages: [
        { id: 1, text: "I need help reviewing a rental contract. What should I look for?", sender: 'user' as const, time: "Yesterday" },
        { id: 2, text: "When reviewing a rental contract in the Philippines, pay attention to: 1) Monthly rent amount and payment terms, 2) Security deposit (typically 2 months' rent), 3) Lease duration and renewal terms, 4) Maintenance responsibilities, 5) Termination clauses, 6) Subletting restrictions, 7) Utilities coverage, and 8) House rules. Make sure all terms comply with the Rent Control Act of 2009 if applicable.", sender: 'ai' as const, time: "Yesterday" }
      ]
    },
    { 
      id: 3, 
      title: "Tenant Rights Question", 
      subtitle: "",
      messages: [
        { id: 1, text: "Can my landlord evict me without notice?", sender: 'user' as const, time: "2 days ago" },
        { id: 2, text: "No, your landlord cannot evict you without proper notice and legal grounds. Under Philippine law, specifically the Civil Code and Rent Control Act, landlords must have valid grounds for eviction (such as non-payment of rent, expiration of lease, or need for personal use) and must provide written notice. The notice period depends on the grounds: typically 30 days for month-to-month leases. Illegal eviction (forcible entry) without court order is a criminal offense under the Revised Penal Code.", sender: 'ai' as const, time: "2 days ago" }
      ]
    }
  ];

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handleLoadConsultation = (consultation: typeof recentConsultations[0]) => {
    setMessages(consultation.messages);
    setCurrentConsultationId(consultation.id);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: inputMessage,
        sender: 'user' as const,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setInputMessage('');
      
      // Simulate AI response (in a real app, this would call your AI API)
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          text: "I'm processing your legal question. In a production environment, this would be connected to the ilovelawyer AI system to provide accurate legal information based on Philippine law.",
          sender: 'ai' as const,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleNewConsultation = () => {
    setMessages([]);
    setCurrentConsultationId(null);
  };

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

      {/* Left Sidebar */}
      <aside className="relative z-10 w-60 bg-[#2A1F1A]/80 backdrop-blur-sm border-r border-[#8B4564]/20 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#8B4564]/20">
          <button 
            onClick={() => router.push('/')}
            className="text-2xl font-semibold hover:opacity-80 transition-opacity"
          >
            <span className="text-white">ilove</span>
            <span className="text-[#8B4564]">lawyer</span>
          </button>
        </div>

        {/* New Consultation Button */}
        <div className="p-4">
          <button 
            onClick={handleNewConsultation}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#8B4564]/20 to-[#8B4564]/20 border border-[#8B4564]/30 rounded-lg hover:from-[#8B4564]/30 hover:to-[#8B4564]/30 transition-all flex items-center justify-center gap-2 text-[#8B4564]"
          >
            <Plus size={18} />
            New Consultation
          </button>
        </div>

        {/* Workspace Section */}
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">WORKSPACE</h3>
            <div className="bg-[#3A2F2A]/50 border border-[#8B4564]/20 rounded-lg p-3 hover:bg-[#3A2F2A] transition-colors cursor-pointer">
              <div className="text-sm text-white mb-1">Current Consultation</div>
              <div className="text-xs text-gray-400">Session_43214...</div>
            </div>
          </div>

          {/* Recent Section */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">RECENT</h3>
            <div className="space-y-2">
              {recentConsultations.map((item) => (
                <div 
                  key={item.id}
                  className="py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-[#3A2F2A]/30 rounded-lg transition-colors cursor-pointer"
                  onClick={() => handleLoadConsultation(item)}
                >
                  {item.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-[#8B4564]/20 space-y-2">
          <button className="w-full px-4 py-3 bg-[#3A2F2A]/50 border border-[#8B4564]/20 rounded-lg hover:bg-[#3A2F2A] transition-all flex items-center gap-3 text-gray-300 hover:text-white">
            <MessageSquare size={18} />
            <span className="text-sm">Chat</span>
          </button>
          <button 
            onClick={() => router.push('/documents')}
            className="w-full px-4 py-3 hover:bg-[#3A2F2A]/30 rounded-lg transition-all flex items-center gap-3 text-gray-300 hover:text-white"
          >
            <FileText size={18} />
            <span className="text-sm">Documents</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-3 hover:bg-[#3A2F2A]/30 rounded-lg transition-all flex items-center gap-3 text-gray-300 hover:text-white"
          >
            <LayoutDashboard size={18} />
            <span className="text-sm">Dashboard</span>
          </button>
        </div>
      </aside>

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