import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, ShieldCheck, ExternalLink } from 'lucide-react';
import { COLORS } from '@/lib/constants';

export function TrustSection() {
  const trustItems = [
    { 
      icon: <Shield size={24} />, 
      title: 'AES-256 Encryption', 
      desc: 'Military-grade encryption protects all your data in transit and at rest.' 
    },
    { 
      icon: <Lock size={24} />, 
      title: 'Zero Knowledge Architecture', 
      desc: 'Your conversations and documents are encrypted end-to-end.' 
    },
    { 
      icon: <Eye size={24} />, 
      title: 'No Third-Party Sharing', 
      desc: 'We never share your data with third parties without explicit consent.' 
    },
    { 
      icon: <ShieldCheck size={24} />, 
      title: 'DPA Compliant', 
      desc: 'Fully compliant with the Philippine Data Privacy Act of 2012 (R.A. 10173).' 
    }
  ];

  return (
    <section className="relative py-20 px-6 z-10">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          className="backdrop-blur border rounded-xl p-12"
          style={{ 
            backgroundColor: `${COLORS.BG_CARD}80`, 
            borderColor: `${COLORS.PRIMARY}4D` 
          }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center mb-12">
            <motion.h2 
              className="text-4xl md:text-5xl mb-4"
              style={{ fontFamily: 'Playfair Display, serif' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Built on Trust & Security
            </motion.h2>
            <motion.p 
              className="text-gray-400 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Legal matters require absolute confidentiality. We prioritize your data security and privacy above all else.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
            >
              <a 
                href="#" 
                className="inline-flex items-center gap-2 transition-colors font-bold"
                style={{ color: COLORS.PRIMARY }}
                onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY_LIGHT}
                onMouseLeave={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              >
                Read Our Privacy Policy <ExternalLink size={16} />
              </a>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {trustItems.map((item, index) => (
              <motion.div 
                key={index} 
                className="border rounded-lg p-6 transition-all duration-300 transform"
                style={{ 
                  backgroundColor: `${COLORS.BG_DARK}80`, 
                  borderColor: `${COLORS.PRIMARY}33` 
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ 
                  y: -5, 
                  borderColor: `${COLORS.PRIMARY}80`,
                  boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}26`
                }}
              >
                <motion.div 
                  className="mb-3"
                  style={{ color: COLORS.PRIMARY }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1, type: "spring" }}
                >
                  {item.icon}
                </motion.div>
                <h3 className="text-lg mb-2 text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="border rounded-lg p-4 text-center"
            style={{ 
              backgroundColor: `${COLORS.PRIMARY}1A`, 
              borderColor: `${COLORS.PRIMARY}4D` 
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <p className="text-sm text-gray-300">
              🔒 Your privacy is our priority. We use industry-standard security measures to protect your information.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
