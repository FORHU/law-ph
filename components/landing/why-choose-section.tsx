import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, BookOpen, DollarSign, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { COLORS, ASSETS } from '@/lib/constants';

interface TimerCardProps {
  navigate: (path: string) => void;
}

const TimerCard = ({ navigate }: TimerCardProps) => {
  const [time, setTime] = useState('0:00.00');
  
  // Clock animation
  useEffect(() => {
    let frame = 0;
    const targetMs = 120000; // 2 minutes in milliseconds (2 * 60 * 1000)
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTime) % targetMs;
      
      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      const centiseconds = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
      
      setTime(`${minutes}:${seconds}.${centiseconds}`);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.div 
      className="relative w-full max-w-[500px] aspect-[4/3] mx-auto lg:ml-auto group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div 
        className="absolute inset-0 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 md:p-10 transition-all duration-500 shadow-2xl"
        style={{ 
          background: `linear-gradient(to bottom right, ${COLORS.PRIMARY}1A, ${COLORS.BG_CARD}66, transparent)`,
          borderColor: `${COLORS.PRIMARY}4D`,
          borderWidth: '2px',
          boxShadow: `0 25px 50px -12px ${COLORS.PRIMARY}1A`
        }}
      >
        {/* Decorative gradient orb like in CapabilitiesSection */}
        <motion.div 
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl transition-all duration-500"
          style={{ backgroundColor: `${COLORS.PRIMARY}0D` }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Stopwatch Icon - Updated to rounded-xl */}
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 relative z-10"
          style={{ backgroundColor: `${COLORS.PRIMARY}33` }}
        >
          <Timer size={32} style={{ color: COLORS.PRIMARY }} strokeWidth={1.5} />
        </div>

        {/* Timer Text */}
        <div className="text-center mb-6 relative z-10">
          <div 
            className="text-6xl md:text-7xl font-serif text-white tracking-tight mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {time}
          </div>
          <div className="text-gray-400 text-sm md:text-base font-medium">Average response time</div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => navigate('/consultation')}
          className="relative z-10 w-full py-4 px-8 font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          style={{ 
            backgroundColor: COLORS.PRIMARY,
            color: COLORS.BG_DARK,
            boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}4D`
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.PRIMARY_LIGHT}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.PRIMARY}
        >
          Try It Now
        </button>
      </div>
    </motion.div>
  );
};

export function WhyChooseSection() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  const benefits = [
    { 
      icon: <Clock size={20} />, 
      title: '24/7 Availability', 
      desc: 'Get legal guidance anytime, anywhere' 
    },
    { 
      icon: <Zap size={20} />, 
      title: 'Instant Responses', 
      desc: 'No waiting for appointments or callbacks' 
    },
    { 
      icon: <BookOpen size={20} />, 
      title: 'Comprehensive Knowledge', 
      desc: 'Based on current legal codes and precedents' 
    },
    { 
      icon: <DollarSign size={20} />, 
      title: 'Affordable Access', 
      desc: 'Quality legal information at a fraction of traditional costs' 
    }
  ];

  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <h2 
                className="text-4xl md:text-5xl lg:text-7xl mb-8 leading-[1.1]"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Why Choose <span className="text-white italic">ilove</span><span style={{ color: COLORS.PRIMARY }}>lawyer</span>?
              </h2>
              <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed max-w-xl">
                Traditional legal consultations can be expensive and time-consuming. ilovelawyer provides immediate, accessible legal guidance when you need it most.
              </p>
            </motion.div>

            <div className="space-y-8">
              {benefits.map((item, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-start gap-5 group/item"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <div 
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover/item:scale-110 transition-transform duration-300"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${COLORS.PRIMARY}, ${COLORS.ACCENT_DARK})`,
                      color: COLORS.BG_DARK,
                      boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}4D`
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="pt-1">
                    <h4 
                      className="text-xl font-bold text-white mb-1 transition-colors group-hover/item:text-opacity-80"
                      onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                    >
                      {item.title}
                    </h4>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex justify-center items-center">
            <TimerCard navigate={navigate} />
          </div>
        </div>
      </div>
    </section>
  );
}
