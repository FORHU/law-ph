'use client'

import { LandingPage } from "@/components/landing-page"
import { Header } from "@/components/header-default";
import { Footer } from "@/components/footer-default";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function Home() {

  const { loggedIn } = useAuth()

  const router = useRouter()
  const navigateToConsultationPage = () => {
    router.push('/consultation')
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0e17] text-white font-sans selection:bg-primary/30 overflow-x-hidden">
      <Header isLoggedIn={loggedIn} />
      <main className="grow w-full">
        <LandingPage onStartConsultation={navigateToConsultationPage} />
      </main>
      <Footer isLoggedIn={loggedIn} />
    </div>
  );
}
