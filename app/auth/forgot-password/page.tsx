import BackButton from "@/components/back-button";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <BackButton
              label="Return to login"
              className="absolute top-5 left-5"
              fallbackHref="/auth/login"
            />
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
