import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

interface InactivityWarningModalProps {
  isOpen: boolean;
  secondsLeft: number;
  onStayActive: () => void;
}

export function InactivityWarningModal({ 
  isOpen, 
  secondsLeft, 
  onStayActive 
}: InactivityWarningModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        onStayActive();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onStayActive]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactivity-warning-title"
          data-testid="inactivity-warning-modal"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30">
                <Clock className="w-8 h-8 text-white" />
              </div>

              <h3 
                id="inactivity-warning-title"
                className="text-xl font-bold text-white mb-3"
              >
                Sessão prestes a expirar
              </h3>

              <p className="text-slate-300 mb-6 leading-relaxed">
                Você será desconectado em{" "}
                <span 
                  className="text-amber-400 font-bold tabular-nums"
                  data-testid="countdown-seconds"
                >
                  {secondsLeft}
                </span>{" "}
                segundos por inatividade.
              </p>

              <button
                ref={buttonRef}
                onClick={onStayActive}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                data-testid="button-stay-active"
              >
                Continuar conectado
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
