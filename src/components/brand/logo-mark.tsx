import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-brand-accent text-zinc-900", className)} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-[58%] w-[58%] fill-none stroke-current" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
        <path d="M5 13.5 8 7h16l3 6.5" />
        <path d="M6 13.5h20v12H6zM10 25.5v-6h5v6M20 17v4" />
        <path d="m18 22 2.2 2.2L25 19.5" />
      </svg>
    </span>
  );
}
