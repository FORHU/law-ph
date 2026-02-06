import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FileCheck, Search, Scale, ArrowRight, Briefcase, BookOpen, Shield } from 'lucide-react';

export function CapabilitiesSection() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  return (
    <section className="relative py-20 px-6 z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="text-[#8B4564] text-sm uppercase tracking-wider mb-3 text-[24px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            POWERFUL FEATURES
          </motion.div>
          <h2 
            className="text-4xl md:text-5xl mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Comprehensive Legal Capabilities
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">Empowering you with tools designed for the complexities of the Philippine legal system.</p>
        </motion.div>

        {/* Main Featured Capability */}
        <motion.div 
          className="mb-8 group"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="relative bg-gradient-to-br from-[#8B4564]/10 via-[#2A2A2A]/50 to-[#1A1A1A] border-2 border-[#8B4564]/30 rounded-2xl p-8 md:p-12 overflow-hidden hover:border-[#8B4564]/60 transition-all duration-500">
            {/* Decorative gradient orb */}
            <motion.div 
              className="absolute top-0 right-0 w-64 h-64 bg-[#8B4564]/5 rounded-full blur-3xl group-hover:bg-[#8B4564]/10 transition-all duration-500"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            ></motion.div>
            
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <motion.div 
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B4564] to-[#6D3650] mb-6 shadow-lg shadow-[#8B4564]/30 group-hover:scale-110 transition-transform duration-300"
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
                >
                  <FileCheck size={36} className="text-[#1A1A1A]" />
                </motion.div>
                <motion.h3 
                  className="text-3xl md:text-4xl mb-4" 
                  style={{ fontFamily: 'Playfair Display, serif' }}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  AI-Powered Document Review
                </motion.h3>
                <motion.p 
                  className="text-gray-300 mb-6 leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  Draft, analyze, and review contracts and legal documents with AI-driven precision. Our system identifies potential issues, ensures compliance with Philippine law, and suggests improvements to protect your interests.
                </motion.p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Contract analysis and risk assessment',
                    'Compliance checking with Philippine regulations',
                    'Clause-by-clause breakdown and explanation',
                    'Automated redlining and suggestions'
                  ].map((item, idx) => (
                    <motion.li 
                      key={idx} 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.6 + idx * 0.1 }}
                    >
                      <div className="mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#8B4564]"></div>
                      </div>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <motion.button 
                  onClick={() => navigate('/documents')}
                  className="px-6 py-3 bg-[#8B4564] text-[#1A1A1A] rounded-lg hover:bg-[#9D5373] transition-all flex items-center gap-2 group/btn"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Document Review
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </motion.button>
              </div>
              
              {/* Visual Element */}
              <div className="hidden md:flex items-center justify-center">
                <div className="relative w-full h-80 bg-[#2A2A2A]/50 rounded-xl border border-[#8B4564]/20 p-6 backdrop-blur">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#8B4564]/20 flex items-center justify-center">
                        <FileCheck size={20} className="text-[#8B4564]" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-[#8B4564]/30 rounded-full w-3/4 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded-full w-1/2"></div>
                      </div>
                    </div>
                    <div className="ml-13 space-y-2 pl-4 border-l-2 border-[#8B4564]/30">
                      <div className="h-2 bg-gray-700 rounded-full w-full"></div>
                      <div className="h-2 bg-gray-700 rounded-full w-5/6"></div>
                      <div className="h-2 bg-[#8B4564]/40 rounded-full w-4/6"></div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Shield size={20} className="text-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-green-500/30 rounded-full w-2/3 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded-full w-1/3"></div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-[#8B4564]/10 border border-[#8B4564]/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#8B4564] animate-pulse"></div>
                        <span className="text-xs text-[#8B4564]">AI Analysis Complete</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-700 rounded-full w-full"></div>
                        <div className="h-2 bg-gray-700 rounded-full w-4/5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Research */}
          <motion.div 
            className="group relative bg-[#2A2A2A]/50 backdrop-blur border border-[#8B4564]/20 rounded-xl p-8 hover:border-[#8B4564]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#8B4564]/10 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B4564]/5 rounded-full blur-2xl group-hover:bg-[#8B4564]/10 transition-all"></div>
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#8B4564]/20 to-[#6D3650]/10 mb-5 border border-[#8B4564]/30 group-hover:scale-110 transition-transform">
                <Search size={28} className="text-[#8B4564]" />
              </div>
              
              <h3 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Advanced Legal Research
              </h3>
              
              <p className="text-gray-300 mb-5 leading-relaxed">
                Get instant citations from Republic Acts, Batas Pambansa, and various Codes. Our AI searches through decades of legal documentation in seconds.
              </p>
              
              <div className="space-y-2 mb-6">
                {[
                  'Instant access to 10,000+ legal documents',
                  'Cross-referenced citations and precedents',
                  'Historical legal amendments tracking'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-[#8B4564]"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => navigate('/consultation')}
                className="text-[#8B4564] hover:text-[#9D5373] transition-colors flex items-center gap-2 group/link"
              >
                Explore Research Tools
                <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Case Summaries */}
          <motion.div 
            className="group relative bg-[#2A2A2A]/50 backdrop-blur border border-[#8B4564]/20 rounded-xl p-8 hover:border-[#8B4564]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#8B4564]/10 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B4564]/5 rounded-full blur-2xl group-hover:bg-[#8B4564]/10 transition-all"></div>
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#8B4564]/20 to-[#6D3650]/10 mb-5 border border-[#8B4564]/30 group-hover:scale-110 transition-transform">
                <Scale size={28} className="text-[#8B4564]" />
              </div>
              
              <h3 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Supreme Court Case Summaries
              </h3>
              
              <p className="text-gray-300 mb-5 leading-relaxed">
                Simplify complex jurisprudence with AI-generated summaries of Supreme Court decisions and landmark cases, making legal precedents accessible.
              </p>
              
              <div className="space-y-2 mb-6">
                {[
                  'Digest of landmark SC decisions',
                  'Key takeaways and legal principles',
                  'Impact analysis on current law'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-[#8B4564]"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              
              <button className="text-[#8B4564] hover:text-[#9D5373] transition-colors flex items-center gap-2 group/link">
                Browse Case Library
                <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Additional Capabilities Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {[
            { 
              icon: <Briefcase size={24} />, 
              title: 'Legal Templates', 
              desc: 'Access pre-drafted templates for common legal documents',
              badge: 'NEW'
            },
            { 
              icon: <BookOpen size={24} />, 
              title: 'Law Explanations', 
              desc: 'Complex legal concepts explained in simple language',
              badge: null
            },
            { 
              icon: <Shield size={24} />, 
              title: 'Compliance Checker', 
              desc: 'Verify compliance with the latest regulations',
              badge: 'BETA'
            }
          ].map((item, index) => (
            <motion.div 
              key={index} 
              className="group bg-[#2A2A2A]/30 backdrop-blur border border-[#8B4564]/10 rounded-lg p-6 hover:border-[#8B4564]/40 transition-all hover:bg-[#2A2A2A]/50"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.15 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-[#8B4564] p-3 bg-[#8B4564]/10 rounded-lg group-hover:bg-[#8B4564]/20 transition-all">
                  {item.icon}
                </div>
                {item.badge && (
                  <motion.span 
                    className="text-xs bg-[#8B4564] text-[#1A1A1A] px-2 py-1 rounded-full font-semibold"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.15, type: "spring" }}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>
              <h4 className="text-lg mb-2 text-white">{item.title}</h4>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
