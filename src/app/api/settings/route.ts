import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  address: optionalText(500),
  phone: optionalText(40),
  email: optionalText(160),
  vatNumber: optionalText(60),
  invoiceFooter: optionalText(300),
});

export async function PATCH(request: Request) {
  const auth = await requireApiAuth("settings:update");
  if (!auth.ok) return fail(auth.message, auth.status);

  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) return fail("Check the business details and try again", 422);

  const existing = await prisma.businessSetting.findFirst();
  const setting = existing
    ? await prisma.businessSetting.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.businessSetting.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      branchId: auth.user.branchId,
      action: "SETTINGS_UPDATED",
      entity: "BusinessSetting",
      entityId: setting.id,
      newValues: JSON.stringify(parsed.data),
    },
  });

  return ok({ id: setting.id, businessName: setting.businessName });
}
