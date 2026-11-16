import { startOfDay } from "date-fns";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { getCashPosition } from "@/server/services/closing";

const closingSchema = z.object({
  actualCash: z.number().min(0),
  reason: z.string().trim().max(300).optional(),
});

/** Saves today's cash count. Closing again on the same day replaces the earlier count. */
export async function POST(request: Request) {
  const auth = await requireApiAuth("closing:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  const parsed = closingSchema.safeParse(await request.json());
  if (!parsed.success) return fail("Enter the cash you counted", 422);

  const closeDate = startOfDay(new Date());
  const position = await getCashPosition(branchId, closeDate);
  const actual = D(parsed.data.actualCash);
  const difference = actual.sub(position.expected);
  if (!difference.isZero() && !parsed.data.reason) return fail("Add a short reason for the difference", 400);

  const data = {
    openingCash: position.opening,
    expectedCash: position.expected,
    actualCash: actual,
    differenceCash: difference,
    differenceReason: parsed.data.reason || null,
    preparedById: auth.user.id,
  };
  const closing = await prisma.dailyClosing.upsert({
    where: { branchId_closeDate: { branchId, closeDate } },
    create: { branchId, closeDate, ...data },
    update: data,
  });
  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      branchId,
      action: "DAY_CLOSED",
      entity: "DailyClosing",
      entityId: closing.id,
      newValues: JSON.stringify({ expected: position.expected.toString(), counted: actual.toString(), difference: difference.toString() }),
    },
  });

  return ok({ id: closing.id, difference: difference.toString() }, 201);
}
