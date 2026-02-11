"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { LogoutConfirmationModal } from "./logout/logout-confirmation-modal";
import { LogoutLoadingOverlay } from "./logout/logout-loading-overlay";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
  onLogoutSuccess?: () => void;
  style?: React.CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function LogoutButton({ 
  className, 
  variant = "ghost", 
  children, 
  onLogoutSuccess,
  style,
  onMouseEnter,
  onMouseLeave
}: LogoutButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirm(false);

    try {
      const supabase = createClient();
      
      // Perform signOut. If this fails due to a stale token, we still want to clear local state.
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error);
      }

      // Small delay to show the "Signing out..." overlay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }

      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Unexpected checkout error:", err);
      // Fallback: forcefully redirect to login if catastrophic failure
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const trigger = children ? (
    <button 
      className={className} 
      onClick={() => setShowConfirm(true)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  ) : (
    <Button 
      variant={variant} 
      className={className} 
      onClick={() => setShowConfirm(true)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );

  return (
    <>
      {trigger}

      <AnimatePresence>
        {showConfirm && (
          <LogoutConfirmationModal 
            onClose={() => setShowConfirm(false)} 
            onConfirm={handleLogout} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoggingOut && (
          <LogoutLoadingOverlay />
        )}
      </AnimatePresence>
    </>
  );
}
