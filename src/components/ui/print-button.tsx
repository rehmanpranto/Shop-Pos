"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "./button";
import { useTr } from "@/components/layout/language";

export function PrintButton({ label = "Print", auto = false }: { label?: string; auto?: boolean }) {
  const tr = useTr();
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {tr(label)}
    </Button>
  );
}
