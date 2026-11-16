"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { navForRole } from "./nav";
import { useTr } from "@/components/layout/language";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useTr();
  const router = useRouter();
  const { user, t } = useApp();
  const role = user.role;
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const items = useMemo(() => navForRole(role).flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), [role]);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.title} ${t(item.key)} ${item.description} ${item.group}`.toLowerCase().includes(needle));
  }, [items, query, t]);
  const selected = Math.min(index, Math.max(results.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={tr("Go to page")}>
      <button type="button" aria-label={tr("Close")} tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-zinc-900/50" />
      <div className="pop-in relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex(Math.min(selected + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex(Math.max(selected - 1, 0));
              } else if (event.key === "Enter" && results[selected]) {
                event.preventDefault();
                go(results[selected].href);
              }
            }}
            placeholder={tr("Where do you want to go?")}
            aria-label={tr("Search pages")}
            className="h-14 w-full bg-transparent text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-zinc-500">{tr("No page matches “")}{query}”.</li> : null}
          {results.map((item, i) => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setIndex(i)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === selected ? "bg-brand-soft" : "")}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", i === selected ? "text-brand" : "text-zinc-400")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">{t(item.key)}</span>
                  <span className="block truncate text-xs text-zinc-500">{tr(item.description)}</span>
                </span>
                {i === selected ? <CornerDownLeft className="h-4 w-4 text-zinc-400" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
