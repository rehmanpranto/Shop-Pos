"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((old) => [...old, { id, message, tone }]);
    timers.current.push(setTimeout(() => setItems((old) => old.filter((item) => item.id !== id)), tone === "error" ? 6000 : 3500));
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pop-in pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg",
              item.tone === "success" ? "bg-zinc-900" : "bg-red-600",
            )}
          >
            {item.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
