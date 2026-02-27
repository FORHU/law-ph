import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AuthBackground } from "../auth/auth-background";
import { BRAND, COLORS } from "@/lib/constants";
import { useAuth } from "../auth/auth-provider";
import { LegalWizard } from "./legal-wizard";

interface HeroSectionProps {
  onStartConsultation: () => void;
}

export function HeroSection({ onStartConsultation }: HeroSectionProps) {
  const [showWizard, setShowWizard] = React.useState(false);
  const router = useRouter();
  const { loggedIn } = useAuth();
  const navigate = (path: string) => router.push(path);

  const handleStartConsultation = () => {
    if (!loggedIn) {
      navigate("/auth/login");
      return;
    }
    navigate("/consultation");
  };

  const handleStartWizard = () => {
    if (!loggedIn) {
      navigate("/auth/login");
      return;
    }
    setShowWizard(true);
  };

  const handleWizardComplete = (data: any) => {
    // Save to sessionStorage for the consultation page to pick up
    sessionStorage.setItem("legal_wizard_data", JSON.stringify(data));
    setShowWizard(false);
    navigate("/consultation");
  };

  return (
    <section className="relative min-h-[80vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-12">
      {/* Background Image with Overlay - Fixed Position */}
      <AuthBackground />

      {/* Hero Content */}
      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column */}
        <div className="flex-1 text-left lg:max-w-2xl flex flex-col items-start w-full">
          {/* Badge */}
          <motion.div
            className="mb-4 text-xs sm:text-sm uppercase tracking-wider text-white inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm self-start"
            style={{
              backgroundColor: `${COLORS.PRIMARY}1A`,
              borderColor: `${COLORS.PRIMARY}4D`,
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Immediate Legal Assistance
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl mb-6 leading-tight text-left"
            style={{ fontFamily: "Playfair Display, serif" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Navigate Philippine Law
            <br />
            <motion.span
              style={{ color: COLORS.PRIMARY }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              with AI Precision
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 max-w-xl text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Your personal legal guide available 24/7. Get instant, cited answers
            based on the Revised Penal Code, Civil Code, and latest Philippine
            jurisprudence.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col gap-4 items-start mb-8 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {/* Top row: Quick Consultation and Learn How It Works */}
            <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
              <motion.button
                className="group relative px-6 md:px-8 py-3 md:py-4 rounded-md overflow-hidden flex items-center justify-center gap-2 text-white font-medium text-sm md:text-base w-full sm:w-auto mt-2 sm:mt-0"
                style={{
                  backgroundColor: COLORS.PRIMARY,
                  boxShadow: `0 0 30px ${COLORS.PRIMARY}40`,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartConsultation}
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: "left" }}
                />
                <span className="relative z-10 whitespace-nowrap">
                  START QUICK CONSULTATION
                </span>
              </motion.button>

              <motion.button
                className="group px-6 md:px-8 py-3 md:py-4 border-2 rounded-md flex items-center justify-center gap-2 text-white relative overflow-hidden text-sm md:text-base w-full sm:w-auto mt-2 sm:mt-0"
                style={{ borderColor: COLORS.PRIMARY }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const element = document.getElementById("how-it-works");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ backgroundColor: COLORS.PRIMARY }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10 whitespace-nowrap">
                  LEARN HOW IT WORKS
                </span>
              </motion.button>
            </div>

            {/* Bottom row: Guided Consultation */}
            <motion.button
              className="px-6 py-2 rounded-full border text-xs font-bold tracking-wider backdrop-blur-sm transition-all duration-300 w-full sm:w-auto mt-2 sm:mt-0"
              style={{
                borderColor: COLORS.PRIMARY,
                color: COLORS.PRIMARY_LIGHT,
                backgroundColor: "rgba(139, 69, 100, 0.1)",
              }}
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(139, 69, 100, 0.2)",
                boxShadow: `0 0 20px ${COLORS.PRIMARY}40`,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartWizard}
            >
              GUIDED CONSULTATION
            </motion.button>
          </motion.div>

          {/* Disclaimer */}
          <motion.div
            className="mt-6 text-xs text-gray-500 max-w-xl text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <em>
              Disclaimer: {BRAND.NAME_PART1}
              {BRAND.NAME_PART2} provides legal information for educational
              purposes, not professional legal advice. It is not a replacement
              for a certified lawyer.
            </em>
          </motion.div>
        </div>

        {/* Right Column - Latest Updates */}
        <motion.div
          className="flex-1 w-full max-w-md hidden lg:block"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl">
            <h3
              className="text-xl font-medium text-white mb-4"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Latest Updates
            </h3>

            <div className="bg-[#0D0D0D] border border-white/5 rounded-xl p-5 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold tracking-wider text-[#D87093]">
                  SEC
                </span>
                <span className="text-xs text-gray-500">Feb 12, 2026</span>
              </div>
              <h4 className="text-base font-medium text-white mb-2 leading-snug">
                Corporate Governance Code Updates
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Securities and Exchange Commission releases amendments to the
                Code of Corporate Governance for listed companies.
              </p>
            </div>

            {/* Carousel Dots */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === 2 ? "bg-[#9D5373]" : "bg-white/10"}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      {showWizard && (
        <LegalWizard
          onClose={() => setShowWizard(false)}
          onSkip={() => {
            setShowWizard(false);
            navigate("/consultation");
          }}
          onComplete={handleWizardComplete}
        />
      )}
    </section>
  );
}
