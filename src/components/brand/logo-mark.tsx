import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Rahman Hardware house-and-R icon on a white tile, so the navy mark stays visible on dark backgrounds. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5", className)} aria-hidden="true">
      <Image src="/brand/logo-icon.png" alt="" width={512} height={501} className="h-full w-full object-contain" priority />
    </span>
  );
}

/** The full "Rahman Hardware, Sanitary and Electronic" text logo, for light backgrounds and printouts. */
export function LogoWordmark({ className, alt = "Rahman Hardware, Sanitary and Electronic" }: { className?: string; alt?: string }) {
  return <Image src="/brand/logo-wordmark.png" alt={alt} width={1400} height={519} className={cn("h-auto object-contain", className)} priority />;
}
