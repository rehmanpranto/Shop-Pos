import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-xl border border-white/90 bg-white/88 px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-zinc-100";

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-zinc-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto py-2", className)} {...props} />;
}
