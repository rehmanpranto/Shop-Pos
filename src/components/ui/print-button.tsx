"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "./button";

export function PrintButton({ label = "Print", auto = false }: { label?: string; auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
