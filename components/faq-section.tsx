
import React from 'react';
import { COLORS } from '@/lib/constants';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => (
  <div 
    className="border-b last:border-0 overflow-hidden"
    style={{ borderColor: `${COLORS.PRIMARY}1A` }}
  >
    <button
      onClick={onClick}
      className="w-full py-6 flex items-center justify-between text-left group transition-all"
    >
      <span 
        className={`text-lg font-bold transition-colors ${isOpen ? '' : 'text-slate-200 group-hover:text-white'}`}
        style={isOpen ? { color: COLORS.PRIMARY } : {}}
      >
        {question}
      </span>
      <span 
        className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180' : 'text-slate-500'}`}
        style={isOpen ? { color: COLORS.PRIMARY } : {}}
      >
        expand_more
      </span>
    </button>
    <div 
      className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <p className="text-slate-400 leading-relaxed text-sm">
        {answer}
      </p>
    </div>
  </div>
);

const FAQSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);

  const faqs = [
    {
      question: "Is LexPH a replacement for a licensed lawyer?",
      answer: "No. LexPH is an AI legal information tool designed to assist with research and document explanation. While it is highly accurate regarding Philippine statutes, it does not provide professional legal advice. We always recommend consulting with a member of the Integrated Bar of the Philippines (IBP) for sensitive legal matters."
    },
    {
      question: "Which Philippine laws are included in the AI's knowledge base?",
      answer: "LexPH is trained on a wide range of Philippine legal documents, including the Revised Penal Code, Civil Code, Labor Code, Family Code, and major Republic Acts like the Data Privacy Act (R.A. 10173). It also uses Google Search grounding to reference recent Supreme Court decisions."
    },
    {
      question: "How secure is the information I share?",
      answer: "Your privacy is our priority. LexPH is built to be fully compliant with the Philippine Data Privacy Act of 2012. All consultations are encrypted, and we do not use your private legal inquiries to train our public AI models."
    },
    {
      question: "Can the AI help me draft legal documents like Affidavits?",
      answer: "Yes, LexPH can help generate initial drafts for simple legal documents, contracts, and demand letters. However, these drafts should always be reviewed and notarized by a qualified lawyer to ensure they are legally binding and contextually accurate."
    },
    {
      question: "Is there a cost to use LexPH?",
      answer: "We offer a free tier for basic legal inquiries and general research. For advanced document analysis, workspace features, and priority grounding, we offer a premium plan designed for students, legal professionals, and small businesses."
    }
  ];

  return (
    <section id="faq" className="py-24 scroll-mt-16" style={{ backgroundColor: `${COLORS.BG_DARK}80` }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ backgroundColor: `${COLORS.PRIMARY}1A`, borderColor: `${COLORS.PRIMARY}33`, color: COLORS.PRIMARY }}
          >
            Common Questions
          </div>
          <h2 className="text-4xl font-black tracking-tight mb-4 text-white">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-lg">Everything you need to know about our legal AI service.</p>
        </div>

        <div 
          className="border rounded-[32px] p-8 md:p-12 backdrop-blur-sm"
          style={{ backgroundColor: `${COLORS.BG_CARD}4D`, borderColor: `${COLORS.PRIMARY}1A` }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={activeIndex === index}
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            />
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Still have questions? <button className="font-bold hover:underline" style={{ color: COLORS.PRIMARY }}>Contact our support team</button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
