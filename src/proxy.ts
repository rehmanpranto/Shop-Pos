import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { homeFor, rolesForPath, type Role } from "@/lib/page-access";

// Signed-out visitors go to /login. Signed-in staff who open a page their role
// is not allowed to use are sent to their own start page instead.
export default withAuth(
  function proxy(request) {
    const role = request.nextauth.token?.role as Role | undefined;
    const allowed = rolesForPath(request.nextUrl.pathname);
    if (role && allowed && !allowed.includes(role)) {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return NextResponse.next();
  },
  { pages: { signIn: "/login" }, secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/sales/:path*",
    "/pos/:path*",
    "/customers/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/refunds/:path*",
    "/payments/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/deliveries/:path*",
    "/quotations/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/audit-logs/:path*",
    "/closing/:path*",
    "/branches/:path*",
    "/receipt/:path*",
    "/print/:path*",
  ],
};
