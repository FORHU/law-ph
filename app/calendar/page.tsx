'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { ASSETS } from '@/lib/constants';

export default function CalendarPage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <motion.img 
          src={ASSETS.LADY_JUSTICE_IMAGE}
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-30 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/70 to-[#1A1A1A]/95"></div>
      </div>

      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full z-20 flex-shrink-0"
          >
            <AppSidebar 
              activePage="calendar"
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="relative z-10 border-b border-[#8B4564]/20 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => router.back()}
                className="hidden md:block p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-300" />
              </button>
              <div>
                <h1 className="text-base md:text-lg font-semibold">Calendar</h1>
                <p className="hidden md:block text-xs text-gray-400">Manage your legal appointments and deadlines</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">February 2026</h2>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Simple Calendar Grid Placeholder */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-gray-500 pb-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`aspect-square border border-white/5 rounded-lg p-2 hover:bg-[#8B4564]/10 transition-all cursor-pointer flex flex-col gap-1 ${
                      i + 1 === 12 ? 'bg-[#8B4564]/20 border-[#8B4564]/40' : ''
                    }`}
                  >
                    <span className={`text-sm ${i + 1 === 12 ? 'text-[#E0A7C2] font-bold' : 'text-gray-400'}`}>
                      {i + 1}
                    </span>
                    {i + 1 === 12 && (
                      <div className="w-full h-1 bg-[#8B4564] rounded-full mt-auto" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-[#8B4564]/10 border border-[#8B4564]/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#8B4564]" />
                  <p className="text-sm font-medium">Court Hearing: Case #2024-001</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-5">Today, 2:00 PM - Regional Trial Court Br. 14</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
