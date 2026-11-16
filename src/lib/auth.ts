import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/response";
import { can } from "@/lib/rbac";

export const authOptions: AuthOptions = {
  // Read on each use so deployment-provided environment variables are available.
  get secret() {
    return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  },
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.branchId = user.branchId;
        token.checkedAt = Date.now();
        return token;
      }
      // Re-read the account every few minutes so a role change or a disabled account takes effect quickly.
      if (token.sub && Date.now() - ((token.checkedAt as number | undefined) ?? 0) > 5 * 60 * 1000) {
        const current = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, branchId: true, isActive: true } });
        if (!current?.isActive) return {};
        token.role = current.role;
        token.branchId = current.branchId;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return { ...session, user: undefined as never };
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as UserRole) ?? UserRole.CASHIER;
        session.user.branchId = (token.branchId as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export async function requireAuth(permission?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw fail("Unauthorized", 401);
  }

  if (permission && !can(session.user.role, permission)) {
    throw fail("Forbidden", 403);
  }

  return session.user;
}
