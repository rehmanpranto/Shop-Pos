import "next-auth";
import "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      branchId: string | null;
      name: string;
      email: string;
    };
  }

  interface User {
    role: UserRole;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    branchId?: string | null;
  }
}
