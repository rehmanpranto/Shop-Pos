import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { homeFor, rolesForPath, type Role } from "@/lib/page-access";

const SECURE_SESSION_COOKIE = "__Secure-next-auth.session-token";

// Sign-in names the session cookie differently on https. Use whichever one the browser sent,
// so this check agrees with sign-in without needing NEXTAUTH_URL to be set.
function sessionCookieName(request: NextRequest) {
  const secure = request.cookies.has(SECURE_SESSION_COOKIE) || request.cookies.has(`${SECURE_SESSION_COOKIE}.0`);
  return secure ? SECURE_SESSION_COOKIE : "next-auth.session-token";
}

// Signed-out visitors go to /login. Signed-in staff who open a page their role
// is not allowed to use are sent to their own start page instead.
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const guarded = withAuth(
    (authed) => {
      const role = authed.nextauth.token?.role as Role | undefined;
      const allowed = rolesForPath(authed.nextUrl.pathname);
      if (role && allowed && !allowed.includes(role)) {
        return NextResponse.redirect(new URL(homeFor(role), authed.url));
      }
      return NextResponse.next();
    },
    {
      pages: { signIn: "/login" },
      secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
      cookies: { sessionToken: { name: sessionCookieName(request) } },
    },
  );
  return guarded(request as NextRequestWithAuth, event);
}

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
