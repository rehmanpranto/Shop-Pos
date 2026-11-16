"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/layout/language";

type Filter = { label: string; value: string };

/**
 * Adds instant search and filter chips to a server-rendered table.
 * Rows are matched on their text; chips match a row's `data-tags` attribute.
 */
export function TableSearch({
  placeholder = "Search",
  filters = [],
  children,
}: {
  placeholder?: string;
  filters?: Filter[];
  children: ReactNode;
}) {
  const tr = useTr();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [counts, setCounts] = useState({ shown: 0, total: 0 });

  useEffect(() => {
    const rows = wrapperRef.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? [];
    const needle = query.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const matchesText = !needle || (row.textContent ?? "").toLowerCase().includes(needle);
      const matchesTag = !tag || (row.dataset.tags ?? "").split(" ").includes(tag);
      const visible = matchesText && matchesTag;
      row.hidden = !visible;
      if (visible) shown += 1;
    });
    setCounts((old) => (old.shown === shown && old.total === rows.length ? old : { shown, total: rows.length }));
  }, [query, tag, children]);

  const filtering = query.trim() !== "" || tag !== "";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(placeholder)}
            aria-label={tr(placeholder)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {filters.length > 0 ? (
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ label: tr("All"), value: "" }, ...filters].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setTag(filter.value)}
                aria-pressed={tag === filter.value}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition sm:h-8 sm:px-3",
                  tag === filter.value ? "border-brand bg-brand text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}
        {filtering ? (
          <p className="text-xs text-zinc-500 sm:ml-auto">
            {counts.shown}{" "}{tr("of")}{" "}{counts.total}
          </p>
        ) : null}
      </div>
      <div ref={wrapperRef}>{children}</div>
      {filtering && counts.shown === 0 && counts.total > 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">{tr("Nothing matches. Try a different search or filter.")}</p>
      ) : null}
    </div>
  );
}
