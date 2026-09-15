# Be Real Humanitarian Works — API

Express 5 + Sequelize + PostgreSQL, plain JavaScript (CommonJS). The full handover guide, conventions and deployment runbook are in the repository root: `../AGENTS.md`.

## Structure

```
server.js      connect to PostgreSQL, apply pending migrations, seed defaults, listen
app.js         helmet, CORS (CLIENT_URLS), Stripe webhook (raw body) before express.json, /uploads, /api
config/        env.js (every variable with its default), content.js (locales, page slugs, nav), pageSchema.js, formFields.js
migrations/    numbered umzug migrations (001 … 008), applied at startup and by `npm run migrate`
models/        Sequelize models, registered and associated in models/index.js
routes/        staff routers (JWT + role) and public.routes.js (no auth, rate-limited writes)
controllers/   request handlers: asyncHandler + ok()/ApiError, apply()/serialize() pattern, audit on every write
validators/    express-validator rule sets (the `validate` middleware returns errors[] with field + message)
services/      email (Resend), media + storage (local or R2), stripe, donations, receipts (PDF), notifications,
               translations, backup, content.seed, siteMessages, turnstile
utils/         apiResponse, apiError, asyncHandler, audit, localized, csv, pagination, sanitize, tokens, totp
scripts/       seed-admin.js (first Super Admin, idempotent), backup.js (daily backup job)
seed/messages/ launch copy used to seed content tables — keep identical to ../frontend/src/messages
uploads/       local media storage (gitignored); served at /uploads with long cache headers
```

## Commands

```bash
npm run dev              # nodemon
npm start                # production (HOST=127.0.0.1 behind nginx)
npm run migrate          # apply pending migrations   (also: migrate:down, migrate:pending)
npm run seed:admin       # first Super Admin from SEED_ADMIN_* in .env
npm run backup           # content JSON + pg_dump + uploads archive to BACKUP_DIR
```

## Environment

Copy `.env.example` to `.env`. Without provider keys the API still runs: emails print to the console, donations use the simulated checkout, media is stored locally. `NODE_ENV=production` refuses the email and payment fallbacks.

Every response uses one envelope: `{ success: true, data, meta? }` or `{ success: false, message, errors? }`.
