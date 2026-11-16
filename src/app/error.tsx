"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-600">The page could not be loaded. Try again, and contact an administrator if this continues.</p>
        <button type="button" onClick={() => reset()} className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Try again
        </button>
      </div>
    </main>
  );
}
