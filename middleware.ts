export { default } from "next-auth/middleware";

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
  ],
};
