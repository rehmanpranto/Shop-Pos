export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Sends JSON to an API route and returns a readable error message on failure. */
export async function sendJson<T = unknown>(url: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (response.ok && result?.success) return { ok: true, data: result.data as T };

    const details = result?.error?.details;
    const detailText = typeof details === "string" ? details.replace(/^Error:\s*/, "") : "";
    const useDetail = detailText && detailText.length < 160 && !detailText.includes("\n");
    return { ok: false, message: useDetail ? detailText : (result?.error?.message ?? "Something went wrong") };
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection." };
  }
}
