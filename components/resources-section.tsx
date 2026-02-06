
import React from 'react';
import { motion } from 'framer-motion';
import Slider from 'react-slick';
import { Building, Scale, Briefcase, BookOpen, FileText, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { COLORS } from '@/lib/constants';

// Import slick-carousel styles partially here if not in globals
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const NextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-0 top-[48%] -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A1A]/80 border border-[#8B4564]/30 text-[#8B4564] hover:bg-[#8B4564] hover:text-white transition-all duration-300 shadow-lg shadow-[#8B4564]/20"
      aria-label="Next Slide"
    >
      <ChevronRight size={24} />
    </button>
  );
};

const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-0 top-[48%] -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A1A]/80 border border-[#8B4564]/30 text-[#8B4564] hover:bg-[#8B4564] hover:text-white transition-all duration-300 shadow-lg shadow-[#8B4564]/20"
      aria-label="Previous Slide"
    >
      <ChevronLeft size={24} />
    </button>
  );
};

const ResourcesSection: React.FC = () => {
  const resources = [
    { 
      icon: <Building size={28} />, 
      badge: 'GOVERNMENT', 
      title: 'Department of Justice', 
      desc: 'Access official DOJ services, legal opinions, and information on Philippine law and regulations.', 
      link: 'Visit Website',
      url: 'https://www.doj.gov.ph/'
    },
    { 
      icon: <Scale size={28} />, 
      badge: 'JUDICIARY', 
      title: 'Supreme Court E-Library', 
      desc: 'Search Philippine jurisprudence, Supreme Court decisions, and legal precedents dating back decades.', 
      link: 'Visit Website',
      url: 'https://elibrary.judiciary.gov.ph/'
    },
    { 
      icon: <Briefcase size={28} />, 
      badge: 'LEGAL AID', 
      title: "Public Attorney's Office", 
      desc: 'Free legal assistance for indigent Filipinos. Find your nearest PAO office for consultation.', 
      link: 'Visit Website',
      url: 'https://pao.gov.ph/'
    },
    { 
      icon: <BookOpen size={28} />, 
      badge: 'DATABASE', 
      title: 'LawPhil Project', 
      desc: 'Comprehensive database of Philippine laws, Supreme Court decisions, and legal resources maintained by Arellano Law Foundation.', 
      link: 'Visit Website',
      url: 'https://lawphil.net/'
    },
    { 
      icon: <FileText size={28} />, 
      badge: 'OFFICIAL', 
      title: 'Official Gazette', 
      desc: 'The official journal of the Republic of the Philippines featuring newly enacted laws, executive orders, and proclamations.', 
      link: 'Visit Website',
      url: 'https://www.officialgazette.gov.ph/'
    },
    { 
      icon: <Scale size={28} />, 
      badge: 'PROFESSIONAL', 
      title: 'Integrated Bar of the Philippines', 
      desc: 'Find accredited lawyers, legal resources, and information about the Philippine legal profession.', 
      link: 'Visit Website',
      url: 'https://www.ibp.ph/'
    }
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    pauseOnHover: true,
    cssEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
    ]
  };

  return (
    <section id="resources" className="relative py-20 px-6 z-10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center md:text-left">
          <motion.div 
            className="inline-block border rounded-full px-4 py-2 text-sm mb-6"
            style={{ backgroundColor: COLORS.BG_CARD, borderColor: `${COLORS.PRIMARY}4D` }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[#8B4564] font-bold tracking-widest text-xs uppercase">CITIZEN HUB</span>
          </motion.div>
          <motion.h2 
            className="text-4xl md:text-5xl mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Verified Legal Resources
          </motion.h2>
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-gray-400 max-w-2xl">Direct access to official government portals and free legal assistance programs in the Philippines.</p>
          </motion.div>
        </div>

        {/* Custom Carousel */}
        <div className="relative px-4 md:px-10">
          <Slider {...settings} className="legal-resources-carousel pb-12">
            {resources.map((item, index) => (
              <div key={index} className="px-3 pb-4">
                <div 
                  className="group relative backdrop-blur border rounded-2xl p-6 h-[340px] flex flex-col transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${COLORS.BG_CARD}CC, ${COLORS.BG_DARK}CC)`,
                    borderColor: `${COLORS.PRIMARY}33`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = `${COLORS.PRIMARY}99`}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = `${COLORS.PRIMARY}33`}
                >
                  {/* Decorative gradient orb */}
                  <div 
                    className="absolute -top-5 -right-5 w-20 h-20 rounded-full blur-1xl transition-all duration-500"
                    style={{ backgroundColor: `${COLORS.PRIMARY}0D` }}
                  ></div>
                  
                  <div className="relative flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div 
                        className="p-3 rounded-xl border transition-all duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${COLORS.PRIMARY}1A`, borderColor: `${COLORS.PRIMARY}33` }}
                      >
                        <div style={{ color: COLORS.PRIMARY }}>{item.icon}</div>
                      </div>
                      <span 
                        className="text-[10px] px-3 py-1.5 rounded-full border font-bold tracking-wider"
                        style={{ 
                          backgroundColor: `${COLORS.PRIMARY}1A`, 
                          color: COLORS.PRIMARY,
                          borderColor: `${COLORS.PRIMARY}33`
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 
                      className="text-xl mb-3 text-white leading-tight group-hover:text-white transition-colors duration-300" 
                      style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed flex-1">
                      {item.desc}
                    </p>

                    {/* Link */}
                    <a 
                      href={item.url} 
                      className="flex items-center gap-2 text-sm font-bold transition-colors group/link"
                      style={{ color: COLORS.PRIMARY }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.link} 
                      <ExternalLink size={14} className="group-hover/link:translate-x-1 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>

                  {/* Bottom accent line */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-[#8B4564]/60 transition-all duration-500"
                    style={{ backgroundImage: `linear-gradient(to right, transparent, ${COLORS.PRIMARY}99, transparent)` }}
                  ></div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;
