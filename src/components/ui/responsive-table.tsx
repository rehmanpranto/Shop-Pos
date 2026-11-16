"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * On phones a wide table is shown as a stack of cards (see `.table-stack` in globals.css).
 * Each cell needs to know its column heading for that, so the headings are copied onto the cells here.
 */
export function ResponsiveTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const table = ref.current?.querySelector("table");
    if (!table) return;
    const headings = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    table.querySelectorAll("tbody tr").forEach((row) => {
      [...row.children].forEach((cell, index) => {
        const label = headings[index] ?? "";
        if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
        // A cell with nothing to show (no text and no buttons) is dropped from the card.
        const empty = (cell.textContent ?? "").trim() === "" && !cell.querySelector("a, button, img, svg");
        cell.toggleAttribute("data-empty", empty);
      });
    });
  });

  return (
    <div ref={ref} className="table-stack overflow-x-auto">
      {children}
    </div>
  );
}
