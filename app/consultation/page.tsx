'use client'

import ConsultationScreen from "@/components/consultation-screen";
import { useRouter } from "next/navigation";

export default function Page() {

  const router = useRouter()

  const navigateToHome = () => {
    router.push('/')
  }

  return (
        <ConsultationScreen onBack={navigateToHome} />
  );
}
