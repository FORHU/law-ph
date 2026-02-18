'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { COLORS, BRAND } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
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
          <div className="text-2xl font-semibold">
            <button onClick={navigateToHome}>
              <span className="text-white">{BRAND.NAME_PART1}</span>
              <span style={{ color: COLORS.PRIMARY }}>{BRAND.NAME_PART2}</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={handleAboutClick}
              className="text-gray-200 hover:text-white transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#e5e7eb'}
            >
              ABOUT
            </button>
            <button
              onClick={handleFaqClick}
              className="text-gray-200 hover:text-white transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#e5e7eb'}
            >
              FAQS
            </button>
            <button
              onClick={handleResourcesClick}
              className="text-gray-200 hover:text-white transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY}
              onMouseLeave={(e) => e.currentTarget.style.color = '#e5e7eb'}
            >
              RESOURCES
            </button>
            {!isLoggedIn ? (
              <button
                onClick={navigateToLogin}
                className="px-6 py-2 border-2 rounded-md transition-all text-white font-medium"
                style={{ 
                  borderColor: COLORS.PRIMARY,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.PRIMARY;
                  e.currentTarget.style.color = COLORS.BG_DARK;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'white';
                }}
              >
                LOGIN
              </button>
            ) : (
              <LogoutButton
                onLogoutSuccess={() => {
                  router.push('/');
                  router.refresh();
                }}
                className="px-6 py-2 border-2 rounded-md transition-all text-white font-medium"
                style={{ 
                  borderColor: COLORS.PRIMARY,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.PRIMARY;
                  e.currentTarget.style.color = COLORS.BG_DARK;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'white';
                }}
              >
                LOGOUT
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
