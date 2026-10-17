'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-4 border-[3px] border-[#111111] dark:border-white transition-all animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-[#F5C800] text-[#111111]'
                : t.type === 'error'
                ? 'bg-[#E63329] text-white'
                : 'bg-[#1A3A6B] text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {t.type === 'success' && (
                <div className="w-5 h-5 bg-[#111111] text-[#F5C800] flex items-center justify-center font-black text-xs shrink-0">
                  ✓
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-5 h-5 bg-white text-[#E63329] flex items-center justify-center font-black text-xs shrink-0">
                  !
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-5 h-5 bg-white text-[#1A3A6B] flex items-center justify-center font-black text-xs shrink-0">
                  i
                </div>
              )}
              <span className="text-xs font-bold uppercase tracking-wider leading-relaxed">
                {t.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:opacity-70 transition ml-2 shrink-0 border border-current"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
