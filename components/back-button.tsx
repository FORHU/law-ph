'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowLeft } from 'lucide-react';




interface BackButtonProps {
  label?: string;
  className?: string;
  fallbackHref?: string;
}

export default function BackButton({
  label = 'Back',
  className = '',
  fallbackHref,
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`group flex items-center gap-2 text-gray-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest p-2 -ml-2 md:p-0 md:ml-0 ${className}`}
    >
      <ArrowLeft size={16} className="hidden md:block group-hover:-translate-x-1 transition-transform" />
      <ChevronLeft size={20} strokeWidth={2.5} className="md:hidden block group-hover:-translate-x-1 transition-transform" />


      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden text-[10px] font-semibold text-gray-500 group-hover:text-white">{label}</span>
    </button>
  );
}

