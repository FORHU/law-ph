import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '@/lib/constants';
import { X, ArrowLeft, ArrowRight, Check, AlertTriangle, Scale } from 'lucide-react';

import { WIZARD_STEPS, LEGAL_SUB_CATEGORIES } from './wizard-constants';

interface LegalWizardProps {
  onClose: () => void;
  onSkip: () => void;
  onComplete: (data: WizardData) => void;
}

export interface WizardData {
  userType: string;
  legalArea: string;
  consultationHistory: string;
  primaryGoal: string;
  urgency: string;
  specificIssue?: string; 
  description?: string;
}

export function LegalWizard({ onClose, onSkip, onComplete }: LegalWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardData>>({});
  const [direction, setDirection] = useState(0);
  
  const getEffectiveSteps = () => {
    const steps = [...WIZARD_STEPS];
    
    // Check if a legal area is selected that has sub-categories
    const selectedAreaFull = formData.legalArea;
    if (selectedAreaFull) {
      // Find the matching main category from keys
      const mainCategory = Object.keys(LEGAL_SUB_CATEGORIES).find(key => selectedAreaFull.startsWith(key));
      
      if (mainCategory) {
        const subCats = LEGAL_SUB_CATEGORIES[mainCategory];
        // Find index of legalArea step
        const areaIndex = steps.findIndex(s => s.id === 'legalArea');
        
        if (areaIndex !== -1) {
            // 1. Insert sub-step after legalArea (if subcats exist)
            steps.splice(areaIndex + 1, 0, {
                id: 'specificIssue',
                question: `What specific ${mainCategory} issue are you facing?`,
                options: subCats
            });
            
            // 2. Insert Description step AFTER the specific issue
            steps.splice(areaIndex + 2, 0, {
                id: 'description',
                question: "Please describe your situation in more detail",
                options: [],
                type: 'input'
            } as any);
        }
      } else {
         // Handle "Other" or any category without sub-cats
         // Just insert Description step after Legal Area
         const areaIndex = steps.findIndex(s => s.id === 'legalArea');
         if (areaIndex !== -1) {
             steps.splice(areaIndex + 1, 0, {
                 id: 'description',
                 question: "Please describe your legal matter",
                 options: [], // No options for input
                 type: 'input'
             } as any);
         }
      }
    }
    return steps;
  };

  const effectiveSteps = getEffectiveSteps();
  const totalSteps = effectiveSteps.length;

  const handleSelect = (option: string) => {
    const currentId = effectiveSteps[currentStep].id as keyof WizardData;
    setFormData(prev => ({ ...prev, [currentId]: option }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const currentId = effectiveSteps[currentStep].id as keyof WizardData;
      setFormData(prev => ({ ...prev, [currentId]: e.target.value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(formData as WizardData);
    }
  };


  // ... (skip logic remains same)

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentQuestion = effectiveSteps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  // Check if current step is an input step
  const isInputStep = (currentQuestion as any).type === 'input';

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-[#0B0B0C] rounded-2xl shadow-2xl overflow-hidden border border-[#722f37]/30 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-8 border-b border-[#722f37]/20 flex items-center justify-between bg-gradient-to-r from-[#722f37]/10 to-transparent">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#722f37]/20 border border-[#722f37]/30">
                    <Scale className="w-5 h-5 text-[#e9c176]" />
                </div>
                <div>
                   <h2 className="text-2xl font-serif text-white tracking-tight">
                     Client <span className="text-[#e9c176] italic">Intake</span>
                   </h2>
                </div>
            </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-8 pt-8 pb-4">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">
                <span>Stage {currentStep + 1} of {totalSteps}</span>
                <span className="text-[#e9c176]">{Math.round(progress)}% Verified</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: COLORS.PRIMARY }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-sidebar-scrollbar">
            <div className="mb-6">
                <p className="text-gray-500 text-sm mb-8 leading-relaxed font-light">
                    Tell us about your legal matter so we can provide accurate guidance.
                </p>
                
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <h3 className="text-2xl font-serif text-white mb-8 leading-tight">
                            {currentQuestion.question}
                        </h3>

                        <div className="space-y-3">
                            {isInputStep ? (
                                <textarea
                                    className="w-full p-5 rounded-2xl bg-[#111111] border border-[#722f37]/20 text-white placeholder-gray-600 focus:outline-none focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/20 transition-all resize-none h-48 text-sm leading-relaxed"
                                    placeholder="Detail the circumstances of your legal matter..."
                                    value={(formData as any)[currentQuestion.id] || ''}
                                    onChange={handleInputChange}
                                    autoFocus
                                />
                            ) : (
                                currentQuestion.options.map((option) => {
                                    const currentValue = (formData as any)[currentQuestion.id];
                                    const isSelected = currentValue === option;
                                    return (
                                        <div 
                                            key={option}
                                            onClick={() => handleSelect(option)}
                                            className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5
                                                ${isSelected 
                                                    ? 'bg-[#722f37]/10 border-[#722f37]/50 shadow-lg shadow-[#722f37]/5' 
                                                    : 'bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.05]' 
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                                ${isSelected ? 'border-[#e9c176] bg-[#e9c176]/10' : 'border-gray-700 group-hover:border-gray-500'}`}>
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-[#e9c176] shadow-[0_0_8px_rgba(233,193,118,0.5)]" />
                                                )}
                                            </div>
                                            <span className={`text-[13px] font-bold uppercase tracking-widest ${isSelected ? 'text-[#e9c176]' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                {option}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {currentStep === 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 p-5 rounded-2xl bg-[#722f37]/5 border border-[#722f37]/20 flex gap-4"
                >
                    <AlertTriangle className="w-5 h-5 text-[#e9c176] shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-500 leading-relaxed">
                        <strong className="text-[#e9c176] block mb-1 uppercase tracking-widest text-[10px]">Attorney-Client Privilege:</strong>
                        Your responses are handled with the highest level of encryption. This helps us prepare initial guidance and does not constitute an attorney-client relationship.
                    </div>
                </motion.div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-8 border-t border-[#722f37]/20 flex justify-between gap-4 bg-[#0B0B0C]">
            <button 
                onClick={currentStep === 0 ? onSkip : handleBack}
                className="px-8 py-4 rounded-xl border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[11px] min-w-[120px]"
            >
                {currentStep === 0 ? 'Skip Session' : 'Retrace'}
            </button>
            <button 
                onClick={handleNext}
                disabled={!(formData as any)[currentQuestion.id]}
                className={`flex-1 px-8 py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all duration-300
                    ${(formData as any)[currentQuestion.id] 
                        ? 'bg-[#722f37] text-white hover:bg-[#8b3a44] shadow-xl shadow-[#722f37]/20 active:scale-95' 
                        : 'bg-white/5 text-gray-700 cursor-not-allowed'}`}
            >
                Proceed
            </button>
        </div>
      </motion.div>
    </div>
  );
}
