'use client'

import { LandingPage } from "@/components/landing-page"
import { AppScreen } from '@/types';
import ConsultationScreen from "@/components/consultation-screen";
import LoginScreen from "@/components/login-screen";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {

  const { loggedIn } = useAuth()

  const router = useRouter()
  const navigateToConsultationPage = () => {
    router.push('/consultation')
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
       <div className="flex flex-col min-h-screen bg-background-dark text-white font-sans selection:bg-primary/30">
          <Header isLoggedIn={loggedIn}  />
        <main className="grow">
          <LandingPage onStartConsultation={navigateToConsultationPage} />
        </main>
          <Footer isLoggedIn={loggedIn}/>
       </div>
    </main>
  );
}

