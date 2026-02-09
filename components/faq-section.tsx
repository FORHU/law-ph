import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { COLORS } from '@/lib/constants';

const FAQSection: React.FC = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: 'Is ilovelawyer a replacement for a licensed lawyer?',
      answer: 'No, ilovelawyer is an AI legal information tool designed to assist with research and document verification. It provides information based on Republic Acts, Batas Pambansa, various Codes, and jurisprudence. We strongly recommend consulting with a member of the Integrated Bar of the Philippines (IBP) for sensitive legal matters.'
    },
    {
      question: 'Which Philippine laws are included in the AI\'s knowledge base?',
      answer: 'Our AI is trained on the Revised Penal Code, Civil Code, Labor Code, Family Code, and many other laws and regulations. We continuously update our database with new legislation and Supreme Court decisions.'
    },
    {
      question: 'How secure is the information I share?',
      answer: 'We use AES-256 encryption and comply with the Data Privacy Act of 2012. Your conversations are encrypted end-to-end and we never share your information with third parties without consent.'
    },
    {
      question: 'Can the AI help me draft legal documents like affidavits?',
      answer: 'Yes, our AI can help you draft basic legal documents and contracts. However, we recommend having any important legal documents reviewed by a licensed attorney before signing.'
    },
    {
      question: 'Is there a cost to use ilovelawyer?',
      answer: 'We offer free consultations to get started. Premium features like unlimited consultations, document analysis, and priority support are available through our subscription plans.'
    }
  ];

  return (
    <section id="faq" className="relative py-20 px-6 z-10">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="text-xs sm:text-sm uppercase tracking-wider mb-3 font-bold"
            style={{ color: COLORS.PRIMARY }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            COMMON QUESTIONS
          </motion.div>
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl mb-4 text-white"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 text-sm sm:text-base px-4">Everything you need to know about our legal AI assistant.</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index} 
              className="backdrop-blur border rounded-lg overflow-hidden transition-all"
              style={{ 
                backgroundColor: `${COLORS.BG_CARD}80`, 
                borderColor: `${COLORS.PRIMARY}33` 
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                scale: 1.02, 
                borderColor: `${COLORS.PRIMARY}80`,
                transition: { duration: 0.2 } 
              }}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${COLORS.PRIMARY}0D`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className={`text-lg transition-colors ${openFaq === index ? 'text-white' : 'text-gray-300'}`} style={openFaq === index ? { color: 'white' } : {}}>
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openFaq === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown 
                    size={20} 
                    style={{ color: COLORS.PRIMARY }}
                  />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === index && (
                  <motion.div 
                    className="px-6 text-gray-400 overflow-hidden"
                    initial={{ opacity: 0, height: 0, paddingBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', paddingBottom: 20 }}
                    exit={{ opacity: 0, height: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <p className="leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
