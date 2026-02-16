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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden border border-gray-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2A2A2A]">
                    <Scale className="w-5 h-5" style={{ color: COLORS.PRIMARY }} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-white flex items-center gap-2">
                     Welcome, there <span className="text-xl">⚖️</span>
                   </h2>
                </div>
            </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-8 pt-6 pb-2">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                <span>Question {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: COLORS.PRIMARY }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
            <div className="mb-6">
                <p className="text-gray-400 text-sm mb-6">
                    Tell us a little bit about your legal situation so we can provide the most relevant guidance and resources.
                </p>
                
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-2xl font-bold text-white mb-6">
                            {currentQuestion.question}
                        </h3>

                        <div className="space-y-3">
                            {isInputStep ? (
                                <textarea
                                    className="w-full p-4 rounded-xl bg-[#2A2A2A] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#8B4564] transition-colors resize-none h-40"
                                    placeholder="Please describe your legal issue..."
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
                                            className={`group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-4
                                                ${isSelected 
                                                    ? 'bg-[#2A2A2A] border-[#8B4564]' // Selected state
                                                    : 'bg-[#2A2A2A]/50 border-transparent hover:border-gray-600 hover:bg-[#2A2A2A]' // Default state
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                                ${isSelected ? 'border-[#8B4564]' : 'border-gray-500 group-hover:border-gray-400'}`}>
                                                {isSelected && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#8B4564]" />
                                                )}
                                            </div>
                                            <span className={`text-base font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
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

            {/* Confidentiality Notice (Static or only on first step? Images show it on step 1) */}
            {currentStep === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 rounded-lg bg-[#2A2A2A]/50 border border-gray-800 flex gap-3"
                >
                    <AlertTriangle className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="text-xs text-gray-400">
                        <strong className="text-gray-300 block mb-1">Confidentiality Notice:</strong>
                        Your responses are encrypted and help our AI provide tailored legal guidance. This is for informational purposes only and does not create an attorney-client relationship.
                    </div>
                </motion.div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-gray-800 flex justify-between gap-4 bg-[#1A1A1A]">
            <button 
                onClick={currentStep === 0 ? onSkip : handleBack}
                className="px-6 py-3 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#2A2A2A] transition-colors font-medium min-w-[100px]"
            >
                {currentStep === 0 ? 'Skip' : 'Back'}
            </button>
            <button 
                onClick={handleNext}
                disabled={!(formData as any)[currentQuestion.id]}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200
                    ${(formData as any)[currentQuestion.id] 
                        ? 'bg-[#8B4564] text-white hover:bg-[#9D5373] shadow-lg shadow-[#8B4564]/20' 
                        : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'}`}
            >
                Continue
            </button>
        </div>
      </motion.div>
    </div>
  );
}
