import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_BRANCH_CODE, DEFAULT_BRANCH_NAME, DEFAULT_UNITS } from "../src/lib/constants";

async function main() {
  let branch = await prisma.branch.findFirst({ where: { code: DEFAULT_BRANCH_CODE } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { code: DEFAULT_BRANCH_CODE, name: DEFAULT_BRANCH_NAME, isDefault: true },
    });
  }

  for (const [name, code] of DEFAULT_UNITS) {
    await prisma.unit.upsert({
      where: { code },
      create: { name, code },
      update: { name },
    });
  }

  await prisma.businessSetting.upsert({
    where: { id: "default-settings" },
    update: {
      businessName: "Hardware ERP POS",
      currency: "BDT",
      currencySymbol: "৳",
    },
    create: {
      id: "default-settings",
      businessName: "Hardware ERP POS",
      currency: "BDT",
      currencySymbol: "৳",
    },
  });

  const paymentAccounts = [
    ["Cash", "CASH"],
    ["Bank - Account 1", "BANK_TRANSFER"],
    ["Card", "CARD"],
    ["bKash", "MOBILE_FINANCIAL_SERVICE"],
    ["Nagad", "MOBILE_FINANCIAL_SERVICE"],
    ["Check", "CHECK"],
  ] as const;

  for (const [name, method] of paymentAccounts) {
    await prisma.paymentAccount.upsert({
      where: {
        branchId_name: {
          branchId: branch.id,
          name,
        },
      },
      create: {
        branchId: branch.id,
        name,
        method,
      },
      update: {
        method,
      },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@hardwareshop.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Owner Admin",
      role: UserRole.ADMIN,
      branchId: branch.id,
      passwordHash,
      isActive: true,
    },
    create: {
      name: "Owner Admin",
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      branchId: branch.id,
      isActive: true,
    },
  });

  const expenseCategories = [
    "Electricity",
    "Rent",
    "Salary",
    "Transportation",
    "Delivery",
    "Maintenance",
    "Office",
    "Marketing",
    "Miscellaneous",
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: {
        branchId_name: {
          branchId: branch.id,
          name,
        },
      },
      create: { branchId: branch.id, name },
      update: {},
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail}`);
  console.log(`Admin password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
