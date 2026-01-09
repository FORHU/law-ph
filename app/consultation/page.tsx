'use client'

import { useAuth } from "@/components/auth-provider";
import ConsultationScreen from "@/components/consultation-screen";
import { useRouter } from "next/navigation";

export default function Page() {

  const { loggedIn } = useAuth()

  const router = useRouter()

  const navigateToHome = () => {
    router.push('/')
  }

  return (
        <ConsultationScreen onBack={navigateToHome} isLoggedIn={loggedIn} />
  );
}
