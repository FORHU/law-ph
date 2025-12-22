
import React, { useState } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ConsultationScreen from './components/ConsultationScreen';
import LoginScreen from './components/LoginScreen';
import Footer from './components/Footer';
import { AppScreen } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LANDING);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
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
  );
};

export default App;
