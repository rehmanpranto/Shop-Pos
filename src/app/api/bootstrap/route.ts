import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_BRANCH_CODE, DEFAULT_BRANCH_NAME, DEFAULT_UNITS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const bootstrapSchema = z.object({
  setupKey: z.string().min(1),
  businessName: z.string().trim().min(1).max(160).default("Hardware ERP POS"),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().email().default("admin@example.com"),
  name: z.string().trim().min(1).max(120).default("Owner"),
  password: z.string().min(8).default("admin12345"),
});

export async function POST(request: Request) {
  try {
    const setupKey = process.env.BOOTSTRAP_SETUP_KEY;
    const parsed = bootstrapSchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail("Invalid initialization data", 422, parsed.error.flatten());
    }

    if (!setupKey || parsed.data.setupKey !== setupKey) {
      return fail("Invalid setup key", 401);
    }

    const result = await prisma.$transaction(async (tx) => {
      if ((await tx.user.count()) > 0) {
        throw new Error("SYSTEM_ALREADY_INITIALIZED");
      }

    const branch = await tx.branch.create({
      data: {
        code: DEFAULT_BRANCH_CODE,
        name: DEFAULT_BRANCH_NAME,
        isDefault: true,
      },
    });

    for (const [name, code] of DEFAULT_UNITS) {
      await tx.unit.create({ data: { name, code } });
    }

    await tx.businessSetting.create({
      data: {
        businessName: parsed.data.businessName,
        address: parsed.data.address,
        phone: parsed.data.phone,
        email: parsed.data.email,
      },
    });

    const accounts = [
      ["Cash", "CASH"],
      ["Bank - Account 1", "BANK_TRANSFER"],
      ["Card", "CARD"],
      ["bKash", "MOBILE_FINANCIAL_SERVICE"],
      ["Nagad", "MOBILE_FINANCIAL_SERVICE"],
      ["Check", "CHECK"],
    ] as const;

    for (const [name, method] of accounts) {
      await tx.paymentAccount.create({
        data: {
          branchId: branch.id,
          name,
          method,
        },
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const admin = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: UserRole.ADMIN,
        branchId: branch.id,
      },
    });

    return { admin, branchId: branch.id };
    });

    return ok({
      message: "System initialized successfully",
      admin: { email: result.admin.email },
      branchId: result.branchId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SYSTEM_ALREADY_INITIALIZED") {
      return fail("System already initialized", 409);
    }
    return fail("Initialization failed", 500, `${error}`);
  }
}
