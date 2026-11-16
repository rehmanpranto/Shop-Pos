// Runs before every build. On Vercel it stops the build when a required setting is
// missing, so the problem shows up in the build log instead of as a sign-in error later.
// Add missing ones in the Vercel dashboard: Settings > Environment Variables.

const missing = [];

if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) missing.push("NEXTAUTH_SECRET");

if (process.env.VERCEL && missing.length > 0) {
  console.error(`\nMissing environment variables: ${missing.join(", ")}`);
  console.error("Add them in Vercel under Settings > Environment Variables, then redeploy.\n");
  process.exit(1);
}
