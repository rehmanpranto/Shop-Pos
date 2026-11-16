import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ success: true, data: { status: "ok", service: "hardware-erp-pos", database: "ok" } });
  } catch {
    return Response.json({ success: false, error: { message: "Database unavailable" } }, { status: 503 });
  }
}
