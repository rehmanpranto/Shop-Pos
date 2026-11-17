"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "./button";
import { useTr } from "@/components/layout/language";

export function PrintButton({ label = "Print", auto = false }: { label?: string; auto?: boolean }) {
  const tr = useTr();
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    // Wait for the logo and any other images, so they are not blank on the printout.
    const pending = Array.from(document.images)
      .filter((image) => !image.complete)
      .map(
        (image) =>
          new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }),
      );
    const timer = setTimeout(() => {
      Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => {
        if (!cancelled) window.print();
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auto]);

  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {tr(label)}
    </Button>
  );
}
