'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { COLORS, BRAND } from '@/lib/constants';
import { LogoutButton } from './logout-button';

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

  /* handleLogout removed in favor of LogoutButton component */

  const scrollToSection = (id: string) => {
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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b"
      style={{
        backgroundColor: `${COLORS.BG_DARK}F2`, // 95% opacity
        borderColor: `${COLORS.PRIMARY}33`
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={navigateToHome}
            className="flex items-center"
          >
            <span className="font-serif italic lowercase text-2xl" style={{ color: COLORS.SECONDARY }}>ilove</span>
            <span className="font-serif text-white font-medium lowercase text-2xl">lawyer</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            <button
              onClick={handleAboutClick}
              className="text-gray-400 hover:text-[#e9c176] transition-all text-[11px] font-bold uppercase tracking-[0.2em] cursor-pointer"
            >
              Institutional Narrative
            </button>
            <button
              onClick={handleFaqClick}
              className="text-gray-400 hover:text-[#e9c176] transition-all text-[11px] font-bold uppercase tracking-[0.2em] cursor-pointer"
            >
              Faq Protocols
            </button>
            <button
              onClick={handleResourcesClick}
              className="text-gray-400 hover:text-[#e9c176] transition-all text-[11px] font-bold uppercase tracking-[0.2em] cursor-pointer"
            >
              Ratified Resources
            </button>
            {isLoggedIn && (
              <LogoutButton
                onLogoutSuccess={() => {
                  router.push('/');
                  router.refresh();
                }}
                className="px-6 py-2 border border-[#722f37]/50 rounded-xl transition-all text-white font-bold text-[10px] uppercase tracking-[0.2em]"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#722f37';
                  e.currentTarget.style.borderColor = '#e9c176';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(114, 47, 55, 0.5)';
                }}
              >
                Sign Out
              </LogoutButton>
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
              className="text-gray-300 hover:text-white transition-colors text-left"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
            >
              ABOUT
            </button>
            <button
              onClick={handleFaqClick}
              className="text-gray-300 hover:text-white transition-colors text-left"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
            >
              FAQS
            </button>
            <button
              onClick={handleResourcesClick}
              className="text-gray-300 hover:text-white transition-colors text-left"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
            >
              RESOURCES
            </button>
            {!isLoggedIn ? (
              <button
                onClick={navigateToLogin}
                className="px-6 py-2 border-2 rounded-md transition-all w-full text-center font-medium"
                style={{
                  borderColor: COLORS.PRIMARY,
                  color: COLORS.PRIMARY
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.PRIMARY;
                  e.currentTarget.style.color = COLORS.BG_DARK;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = COLORS.PRIMARY;
                }}
              >
                LOGIN
              </button>
            ) : (
              <LogoutButton
                onLogoutSuccess={() => {
                  router.push('/');
                  router.refresh();
                  setMobileMenuOpen(false);
                }}
                className="px-6 py-2 border-2 rounded-md transition-all w-full text-center font-medium"
                style={{
                  borderColor: COLORS.PRIMARY,
                  color: COLORS.PRIMARY
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.PRIMARY;
                  e.currentTarget.style.color = COLORS.BG_DARK;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = COLORS.PRIMARY;
                }}
              >
                LOGOUT
              </LogoutButton>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
