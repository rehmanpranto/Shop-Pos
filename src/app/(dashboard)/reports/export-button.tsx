"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = Record<string, string | number>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (value: string | number) => {
    const text = String(value);
    // Quote anything with separators, and neutralise cells a spreadsheet would read as a formula.
    const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => cell(row[h])).join(","))].join("\n");
}

export function ExportButton({ rows, fileName, label }: { rows: Row[]; fileName: string; label: string }) {
  function download() {
    const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={download} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
