# Be Real Humanitarian Works — website, backoffice and API

Public website, staff backoffice and REST API for Be Real Humanitarian Works Inc., a Texas 501(c)(3) public charity. Built by Godwin Tech Solution.

| Folder | What it is | Stack | Port |
|---|---|---|---|
| `frontend/` | Public website in English, French and Spanish | Next.js 16, Tailwind 4, shadcn/ui, next-intl | 3000 |
| `backoffice/` | Staff backoffice (separate site, same brand) | Next.js 16, Tailwind 4, shadcn/ui, recharts, Tiptap | 3001 |
| `backend/` | REST API and content store | Node 22, Express 5, Sequelize, PostgreSQL, Stripe, Resend | 4000 |

## What the backoffice manages

- **Inbox** — volunteer, partnership, assistance and contact form submissions (status workflow, notes, assignment, CSV, spam quarantine), newsletter subscribers, per-form notification recipients.
- **Content** — every text and photo on the site in EN / FR / ES with drafts, preview, publish and version history; programs, team (with photo approval), impact metrics / stories / stewardship updates, media library (Cloudflare R2 or local storage), legal pages.
- **Translations** — status per field, native-speaker review marks, translator worksheet export / import.
- **Donations** — Stripe Checkout (one-time gifts, organization absorbs fees), receipt numbering, localized receipt email + PDF, ledger with refunds and payouts, donor lookup.
- **Administration** — users and roles (Super Admin / Editor / Read-only), two-factor authentication, audit log, system health and email delivery log.

## Run it locally

Prerequisites: Node 22, PostgreSQL 16+ with a database `be_real_humanitarian`.

```bash
# API
cd backend && cp .env.example .env      # fill DB_*, JWT_SECRET, PREVIEW_SECRET, SEED_ADMIN_*
npm install && npm run seed:admin && npm run dev

# Website
cd frontend && cp .env.example .env.local
npm install && npm run dev

# Backoffice
cd backoffice && cp .env.example .env.local
npm install && npm run dev
```

Migrations run automatically when the API starts; content tables are seeded from the launch copy on first run.

Production-style run on one machine (optimized builds, API without nodemon): `start-production.ps1` / `stop-production.ps1`.

## Provider keys

Everything works without them, with clearly labelled fallbacks:

| Variable (API `.env`) | Without it |
|---|---|
| `RESEND_API_KEY` | emails are printed to the API log (development / staging only) |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | donations use a simulated checkout (development / staging only) |
| `R2_*` | media is stored in `backend/uploads/` |
| `TURNSTILE_SECRET_KEY` | forms rely on the honeypot only |

`NODE_ENV=production` refuses the email and payment fallbacks.

## Not in this repository

Design mocks, the specification documents and the source photo set are kept outside the repository (`mocks/`, `doc/`, `images/` are ignored). Secrets live only in the `.env` files, which are ignored too — the `.env.example` files list every variable.
