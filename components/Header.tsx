
import React from 'react';
import { AppScreen } from '../types';

interface HeaderProps {
  onNavigate: (screen: AppScreen) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const scrollToSection = (id: string) => {
    // Navigate to landing screen first
    onNavigate(AppScreen.LANDING);
    
    // Allow time for the landing page to mount before scrolling
    setTimeout(() => {
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
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
    <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => onNavigate(AppScreen.LANDING)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-primary">
              <span className="material-symbols-outlined text-3xl">balance</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">LexPH</h2>
          </button>
          
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => onNavigate(AppScreen.LANDING)}
              className="text-sm font-medium text-gray-300 hover:text-primary transition-colors"
            >
              About
            </button>
            <a 
              href="#faq" 
              onClick={handleFaqClick}
              className="text-sm font-medium text-gray-300 hover:text-primary transition-colors"
            >
              FAQs
            </a>
            <a 
              href="#resources" 
              onClick={handleResourcesClick}
              className="text-sm font-medium text-gray-300 hover:text-primary transition-colors"
            >
              Resources
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate(AppScreen.LOGIN)}
              className="rounded-lg h-9 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-lg shadow-primary/20"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
