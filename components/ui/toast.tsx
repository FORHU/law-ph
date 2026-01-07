"use client";

import { X, Check, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { JSX } from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-success-soft text-fg-success border-success",
  error: "bg-destructive/10 text-destructive border-destructive",
  info: "bg-neutral-primary-soft text-body border-default",
};

const variantIcons: Record<ToastVariant, JSX.Element> = {
  success: <Check className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export function Toast({
  message,
  variant = "info",
  onClose,
}: ToastProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full max-w-sm items-center gap-3 rounded-base border p-4 shadow-xs",
        variantStyles[variant]
      )}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded bg-white/20">
        {variantIcons[variant]}
      </div>

      <p className="text-sm flex-1">{message}</p>

      {onClose && (
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-black/10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
