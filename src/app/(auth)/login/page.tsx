import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setting = await prisma.businessSetting.findFirst({ select: { businessName: true } }).catch(() => null);
  return <LoginForm businessName={setting?.businessName ?? DEFAULT_BUSINESS_NAME} />;
}
