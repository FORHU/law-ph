import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowRight } from 'lucide-react';
import ChatConversationDemo from '../chat-conversation-demo';

export function DemoSection() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  return (
    <section className="relative py-20 px-6 z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-[#8B4564] text-sm uppercase tracking-wider mb-3 text-[24px]">LIVE PREVIEW</div>
          <h2 
            className="text-4xl md:text-5xl mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            AI Legal Consultation in Action
          </h2>
          <p className="text-gray-400">See how our AI provides instant, accurate legal guidance based on Philippine law.</p>
        </motion.div>

        <motion.div 
          className="bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl p-6 md:p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <ChatConversationDemo />

          {/* Start Consultation Button - Centered and Enhanced */}
          <motion.div 
            className="flex justify-center pt-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 8 }}
          >
            <motion.button 
              onClick={() => navigate('/consultation')}
              className="group relative px-8 py-4 bg-gradient-to-r from-[#8B4564] to-[#9D5373] text-[#1A1A1A] rounded-lg hover:shadow-2xl hover:shadow-[#8B4564]/40 transition-all duration-300 transform hover:scale-105 overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#9D5373] to-[#8B4564] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2 font-medium">
                <MessageSquare size={20} />
                Start Your Consultation
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
