'use client'

import { LandingPage } from "@/components/landing-page"
import { AppScreen } from '@/types';
import ConsultationScreen from "@/components/consultation-screen";
import LoginScreen from "@/components/login-screen";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import React from "react";

export default function Home() {
    const [currentScreen, setCurrentScreen] = React.useState<AppScreen>(AppScreen.LANDING);
    const navigateTo = (screen: AppScreen) => {
      setCurrentScreen(screen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

  return (
    <main className="min-h-screen flex flex-col items-center">
          <div className="flex flex-col min-h-screen bg-background-dark text-white font-sans selection:bg-primary/30">
      {currentScreen !== AppScreen.LOGIN && <Header onNavigate={navigateTo} />}
      
      <main className="flex-grow">
        {currentScreen === AppScreen.LANDING && (
          <LandingPage onStartConsultation={() => navigateTo(AppScreen.CONSULTATION)} />
        )}
        {currentScreen === AppScreen.CONSULTATION && (
          <ConsultationScreen onBack={() => navigateTo(AppScreen.LANDING)} />
        )}
        {currentScreen === AppScreen.LOGIN && (
          <LoginScreen onBack={() => navigateTo(AppScreen.LANDING)} onLoginSuccess={() => navigateTo(AppScreen.CONSULTATION)} />
        )}
      </main>

      {currentScreen !== AppScreen.LOGIN && <Footer />}
    </div>
    </main>
  );
}

