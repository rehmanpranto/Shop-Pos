"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#f5f4f0]">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-zinc-900">The app needs to restart</h1>
            <p className="mt-2 text-sm text-zinc-600">Please try again. If the problem persists, contact your administrator.</p>
            <button type="button" onClick={() => reset()} className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Reload app
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
