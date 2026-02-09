import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, FileText, ArrowRight } from 'lucide-react';
import { COLORS } from '@/lib/constants';

export function HowItWorksSection() {
  const steps = [
    { 
      icon: <MessageSquare size={24} />, 
      step: '1', 
      title: 'Ask Your Question', 
      desc: 'Type your legal question in plain language. No legal jargon required.' 
    },
    { 
      icon: <Search size={24} />, 
      step: '2', 
      title: 'AI Analysis', 
      desc: 'Our AI searches through Philippine legal codes, jurisprudence, and regulations.' 
    },
    { 
      icon: <FileText size={24} />, 
      step: '3', 
      title: 'Receive Guidance', 
      desc: 'Receive cited legal information with references to specific laws and cases.' 
    },
    { 
      icon: <ArrowRight size={24} />, 
      step: '4', 
      title: 'Take Action', 
      desc: 'Use insights to make informed decisions or consult with a licensed attorney.' 
    }
  ];

  return (
    <section id="about" className="relative py-12 md:py-20 px-6 z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div 
            className="uppercase tracking-wider mb-3 text-xs sm:text-sm font-bold"
            style={{ color: COLORS.PRIMARY }}
          >SIMPLE PROCESS</div>
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >How It Works</h2>
          <p className="text-gray-300 text-sm sm:text-base">Getting legal guidance has never been easier. Follow these simple steps.</p>
        </motion.div>

        {/* Desktop View - Horizontal with connecting lines */}
        <div className="hidden md:block relative">
          {/* Connecting Line - Animated */}
          <motion.div 
            className="absolute top-[50px] left-0 right-0 h-0.5"
            style={{ background: `linear-gradient(to right, transparent, ${COLORS.PRIMARY}80, transparent)` }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          
          <div className="grid grid-cols-4 gap-6 relative">
            {steps.map((item, index) => (
              <motion.div 
                key={index} 
                className="relative group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.2,
                  ease: "easeOut"
                }}
              >
                {/* Step Number Circle */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <motion.div 
                      className="w-[100px] h-[100px] rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative z-10"
                      style={{ 
                        background: `linear-gradient(to bottom right, ${COLORS.PRIMARY}, ${COLORS.ACCENT_DARK})`,
                        boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}33`
                      }}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.2 + 0.2,
                        type: "spring",
                        stiffness: 200
                      }}
                    >
                      <motion.span 
                        className="text-3xl font-semibold" 
                        style={{ fontFamily: 'Playfair Display, serif', color: COLORS.BG_DARK }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: index * 0.2 + 0.4 }}
                      >
                        {item.step}
                      </motion.span>
                    </motion.div>
                  </div>
                </div>

                {/* Card */}
                <motion.div 
                  className="backdrop-blur border rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 min-h-[240px]"
                  style={{ 
                    backgroundColor: `${COLORS.BG_CARD}80`, 
                    borderColor: `${COLORS.PRIMARY}33`,
                    boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}1A`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = `${COLORS.PRIMARY}99`}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = `${COLORS.PRIMARY}33`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: index * 0.2 + 0.3 }}
                >
                  <div className="mb-4 flex justify-center" style={{ color: COLORS.PRIMARY }}>
                    {item.icon}
                  </div>
                  <h3 className="text-2xl mb-3 text-center text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-sm text-center leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile View - Vertical with timeline */}
        <div className="md:hidden space-y-8">
          {steps.map((item, index) => (
            <motion.div 
              key={index} 
              className="flex gap-6"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.2,
                ease: "easeOut"
              }}
            >
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <motion.div 
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${COLORS.PRIMARY}, ${COLORS.ACCENT_DARK})`,
                    boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}33`
                  }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.2 + 0.2,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  <motion.span 
                    className="text-2xl" 
                    style={{ fontFamily: 'Playfair Display, serif', color: COLORS.BG_DARK }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.2 + 0.4 }}
                  >
                    {item.step}
                  </motion.span>
                </motion.div>
                {index < 3 && (
                  <motion.div 
                    className="w-0.5 h-24 mt-2"
                    style={{ 
                      background: `linear-gradient(to bottom, ${COLORS.PRIMARY}, ${COLORS.PRIMARY}33)`,
                      transformOrigin: "top"
                    }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.2 + 0.5
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <motion.div 
                className="flex-1 backdrop-blur border rounded-xl p-6"
                style={{ 
                  backgroundColor: `${COLORS.BG_CARD}80`, 
                  borderColor: `${COLORS.PRIMARY}33`,
                  boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}1A`
                }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.2 + 0.3 }}
              >
                <div className="mb-3" style={{ color: COLORS.PRIMARY }}>
                  {item.icon}
                </div>
                <h3 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
