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
