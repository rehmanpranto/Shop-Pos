import { ok } from "@/lib/response";

export async function GET() {
  return ok({ status: "ok", service: "hardware-erp-pos" });
}
