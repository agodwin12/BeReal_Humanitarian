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
- **Donations** — Stripe Checkout, one-time and monthly gifts (subscriptions with a donor self-service link), optional "cover the processing fee" add-on (off by default), receipt numbering, localized receipt email + PDF per payment, ledger with refunds and payouts, donor lookup.
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

## Deployment (VPS)

`deploy/vps/` holds everything the server needs: `ecosystem.config.js` (pm2 process list — API on 127.0.0.1:4000, website on 127.0.0.1:3002, backoffice on 127.0.0.1:3003), `nginx-bereal.conf` (one virtual host per app, TLS added by certbot) and `deploy.sh`.

First-time setup on Ubuntu 24.04 with Node 22, pm2, nginx and certbot already present:

```bash
apt-get install -y postgresql            # then create the role + database named in backend/.env
git clone https://github.com/agodwin12/BeReal_Humanitarian.git /var/www/bereal
# create backend/.env, frontend/.env.local, backoffice/.env.local from the .env.example files
cp /var/www/bereal/deploy/vps/nginx-bereal.conf /etc/nginx/sites-available/bereal
ln -s /etc/nginx/sites-available/bereal /etc/nginx/sites-enabled/bereal && nginx -t && systemctl reload nginx
bash /var/www/bereal/deploy/vps/deploy.sh   # install, migrate, seed the first Super Admin, build, pm2, nginx reload
certbot --nginx -d <site host> -d <backoffice host> -d <api host>
```

Every later release is `git push` from the PC, then on the server:

```bash
bash /var/www/bereal/deploy/vps/deploy.sh
```

The API runs with `NODE_ENV=staging` until the Resend and Stripe keys exist (emails go to `pm2 logs bereal-api`, donations use the simulated checkout).

Real domain: `nginx-berealhumanitarian.org.conf` holds the hosts for `berealhumanitarian.org` (website, `www` redirects to it), `portal.berealhumanitarian.org` (backoffice) and `api.berealhumanitarian.org` (API). DNS at the registrar: A records for `@`, `portal` and `api` pointing at the server, `www` as a CNAME to the apex. Once they resolve, `switch-domain.sh` issues the certificate, rewrites the env URLs and stored media URLs, rebuilds, and turns the temporary nip.io names into redirects.

## Not in this repository

Design mocks, the specification documents and the source photo set are kept outside the repository (`mocks/`, `doc/`, `images/` are ignored). Secrets live only in the `.env` files, which are ignored too — the `.env.example` files list every variable.
