"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { Portal } from "./portal";
import { useTranslation } from '@/lib/i18n/language-provider';

interface AlertState {
  message: string;
  title: string;
}

interface AlertContextValue {
  showAlert: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
});

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null);
  const { t } = useTranslation();

  const showAlert = useCallback((message: string, title = t('common.notice')) => {
    setAlert({ message, title });
  }, [t]);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AnimatePresence>
        {alert && (
          <Portal>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pointer-events-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAlert}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-sm bg-[#1A1A1A] border p-1 rounded-2xl shadow-2xl"
                style={{ borderColor: `${COLORS.PRIMARY}33` }}
              >
                <div className="bg-[#1A1A1A]/80 p-6 rounded-[calc(1rem-4px)]">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="p-3 rounded-xl shrink-0"
                      style={{ backgroundColor: `${COLORS.PRIMARY}22` }}
                    >
                      <AlertCircle className="w-6 h-6" style={{ color: COLORS.PRIMARY }} />
                    </div>
                    <h3 className="text-xl font-semibold text-white leading-tight">
                      {alert.title}
                    </h3>
                  </div>

                  {/* Message */}
                  <p className="text-gray-400 mb-6 leading-relaxed text-sm">
                    {alert.message}
                  </p>

                  {/* OK button */}
                  <button
                    onClick={closeAlert}
                    className="w-full px-4 py-3 text-sm font-medium text-white rounded-xl transition-all active:scale-95 shadow-lg"
                    style={{
                      backgroundColor: COLORS.PRIMARY,
                      boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}44, 0 4px 6px -2px ${COLORS.PRIMARY}22`,
                    }}
                  >
                    {t('common.ok')}
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}
