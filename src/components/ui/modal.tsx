"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/layout/language";

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const tr = useTr();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href]");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button[data-autofocus]")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={tr("Close")} tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-zinc-900/50" />
      <div
        ref={panelRef}
        className={cn(
          "pop-in relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-2xl",
          size === "lg" && "sm:max-w-4xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
            {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
