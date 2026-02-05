import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  isLoggedIn?: boolean;
}

export function Header({ isLoggedIn }: HeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateToHome = () => {
    router.push('/');
    setMobileMenuOpen(false);
  };

  const navigateToLogin = () => {
    router.push('/auth/login');
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    // Navigate to landing screen first if needed, logic preserved from original
    setTimeout(() => {
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    setMobileMenuOpen(false);
  };

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection('about');
  };

  const handleFaqClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection('faq');
  };

  const handleResourcesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection('resources');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#8b456400] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between bg-[#8b456400]">
          {/* Logo */}
          <div className="text-2xl font-semibold">
            <button onClick={navigateToHome}>
              <span className="text-white">ilove</span>
              <span className="text-[#8B4564]">lawyer</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={handleAboutClick}
              className="text-gray-200 hover:text-[#8B4564] transition-colors"
            >
              ABOUT
            </button>
            <button
              onClick={handleFaqClick}
              className="text-gray-200 hover:text-[#8B4564] transition-colors"
            >
              FAQS
            </button>
            <button
              onClick={handleResourcesClick}
              className="text-gray-200 hover:text-[#8B4564] transition-colors"
            >
              RESOURCES
            </button>
            {!isLoggedIn && (
              <button
                onClick={navigateToLogin}
                className="px-6 py-2 border-2 border-[#8B4564] rounded-md hover:bg-[#8B4564] hover:text-[#1A1A1A] transition-all text-[#ffffff]"
              >
                LOGIN
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            <button
              onClick={handleAboutClick}
              className="text-gray-300 hover:text-[#8B4564] transition-colors text-left"
            >
              ABOUT
            </button>
            <button
              onClick={handleFaqClick}
              className="text-gray-300 hover:text-[#8B4564] transition-colors text-left"
            >
              FAQS
            </button>
            <button
              onClick={handleResourcesClick}
              className="text-gray-300 hover:text-[#8B4564] transition-colors text-left"
            >
              RESOURCES
            </button>
            {!isLoggedIn && (
              <button
                onClick={navigateToLogin}
                className="px-6 py-2 border-2 border-[#8B4564] text-[#8B4564] rounded-md hover:bg-[#8B4564] hover:text-[#1A1A1A] transition-all w-full md:w-auto"
              >
                LOGIN
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
