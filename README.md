# Hardware ERP POS

Next.js ERP and point-of-sale application backed by Prisma and Neon Postgres.

## Launch checklist

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure `.env` from `.env.example`. Set unique `NEXTAUTH_SECRET` and
   `BOOTSTRAP_SETUP_KEY` values; never use the example values in production.

3. Apply the database schema:

   ```bash
   npm run db:deploy
   ```

4. Build and start the production server:

   ```bash
   npm run build
   npm start
   ```

5. Open `/login`. On a fresh database, initialize the first administrator with
   `POST /api/bootstrap` using the configured bootstrap key, or run the seed
   command with explicit `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values.

The health endpoint is available at `/api/health`.

## Vercel deployment

Import this repository into Vercel with the framework preset set to
**Next.js**. Vercel will use the default install and build commands; the
`postinstall` script generates Prisma Client automatically.

Add these Production environment variables in Vercel:

- `DATABASE_URL` — Neon pooled connection string
- `NEXTAUTH_URL` — your production Vercel URL
- `NEXTAUTH_SECRET` — a long random secret
- `BOOTSTRAP_SETUP_KEY` — a separate random setup key

Optional email variables are `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_FROM`. After the first administrator is created,
rotate or remove `BOOTSTRAP_SETUP_KEY`.

## Development

```bash
npm run dev
```

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
