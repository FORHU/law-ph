'use client'
import BackButton from "@/components/back-button";
import { SignUpForm } from "@/components/sign-up-form";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter()

  const onBack = () => {
    router.push('/auth/login')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <BackButton
        label="Return to login"
        className="absolute top-5 left-5"
        fallbackHref="/auth/login"
      />

      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
