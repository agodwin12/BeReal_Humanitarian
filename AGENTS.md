# AGENTS.md — handover guide for AI agents and new developers

Read this before touching anything. It explains what the project is, how the three apps fit together, the conventions every feature follows, how to run and deploy, and the rules that must never be broken. Last full revision: 2026-09-14 (everything described here is live).

---

## 1. What this is

**Be Real Humanitarian Works Inc.** is a Texas 501(c)(3) public charity (EIN 42-4496023) founded by **Desmond Nkemzi**. The site presents the organization, its programs, its impact, a photo/video gallery, four contact forms and an online donation flow, in **English, French and Spanish**.

The code is built and operated by **Michel (Godwin Tech Solution)**. Michel holds every credential (VPS, Stripe, Resend, Hostinger, admin accounts). Desmond is the product owner and the only person who decides content, wording, money and photo publication.

| App | Folder | Live URL | Local URL | Stack |
|---|---|---|---|---|
| Public website | `frontend/` | https://berealhumanitarian.org | http://localhost:3000 | Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, shadcn/ui on Base UI, next-intl 4, motion, react-hook-form + zod |
| Staff backoffice ("the portal") | `backoffice/` | https://portal.berealhumanitarian.org | http://localhost:3001 | Next.js 16, Tailwind 4, shadcn/ui, TanStack Table, Tiptap, recharts, sonner, next-themes |
| REST API | `backend/` | https://api.berealhumanitarian.org | http://localhost:4000 (`/health`) | Node 22, Express 5, Sequelize 6 + PostgreSQL 16, umzug migrations, express-validator, JWT, multer + sharp, Stripe SDK 22, Resend (HTTP API), pdfkit |

Repository: public GitHub `agodwin12/BeReal_Humanitarian`, branch `main`. Production runs the `main` branch as-is.

The website works even when the API is down: every CMS helper returns `null` and the page falls back to the built-in launch copy in `frontend/src/messages/*.json`.

---

## 2. Rules that must never be broken

These come from Desmond and Michel. They are not style preferences.

1. **Never invent facts.** No made-up impact numbers, dates, addresses, phone numbers, emails, names or quotes. If a value is unknown, leave the field empty (the UI hides empty rows) and say so. The gallery entry for the Calvary distribution has no date for exactly this reason.
2. **Beneficiary photos need documented consent.** Photos of people receiving aid (for example the envelopes marked "25 000 FCFA" in the source photo set) are **not** published unless consent is on file. Volunteers behind the banner are fine. The media library has a `consentOnFile` flag; keep it honest.
3. **The registered street address is never published.** The public location is "Greater Houston Area, Texas". Contact says "Mailing address available on request."
4. **Request Assistance is not an emergency service.** Its inbox is Super Admin only. Do not add wording that promises urgent help.
5. **Secrets live only in the API `.env` on the server** (and Michel's local `.env`). Never in the repo, never in the browser bundle, never in the portal UI, never in this file. Stripe and Resend keys are read from `backend/.env` exclusively.
6. **Never commit** `mocks/`, `doc/`, the root `images/` folder or any `.env*` file. `.gitignore` already blocks them. (`frontend/public/images` and `backoffice/public` are fine and are committed.)
7. **Never touch the user's git credential store** or run anything that rewrites credentials.
8. **The agent never moves real money.** No live card payments, no refunds, no payouts. Desmond makes the live $1 test donation and refunds it himself. Local testing uses the simulated checkout (see §7).
9. **Do not touch the other apps on the VPS.** The server also runs `calvary-website` (pm2, port 3000) and `money-note` (pm2, port 3001, nginx default vhost). Our apps bind to 127.0.0.1 on 4000 / 3002 / 3003 and have their own nginx files.
10. **Update the feature tracker after every feature** (`doc/backoffice-features.md`, see §12). It is gitignored, so it only exists on Michel's workstation; ask for it if you do not have it.
11. **Commit and deploy only when Michel asks.** Fix locally first when told so.

---

## 3. Repository map

```
BeReal_Humanitarian/
├── AGENTS.md                  this guide
├── README.md                  short public overview + VPS runbook
├── start-production.ps1       run all three apps on Windows the production way (see §6)
├── stop-production.ps1
├── backend/                   Express API (plain JavaScript, CommonJS)
├── frontend/                  public website (TypeScript)
├── backoffice/                staff portal (TypeScript)
├── deploy/vps/                everything the server needs (§8)
├── doc/          (ignored)    tracker, scope, spec .docx, project-structure.md — Michel's PC only
├── mocks/        (ignored)    design mock-ups
└── images/       (ignored)    source photo set (Joan, Calvary distribution, AI samples)
```

Line endings: `*.sh` are forced to LF by `.gitattributes`. Many backoffice files are CRLF on disk; when editing with scripts, normalise EOL rather than assuming LF.

---

## 4. How the pieces talk to each other

```
Browser ──► website (Next, server components) ──GET /api/public/*──► API ──► PostgreSQL
                │  ISR: revalidate 30 s, Draft Mode = no-store + x-preview-token
                └──► /api/messages/[locale] (serves the built-in copy to the API's Pages editor)

Browser ──► website chat widget ──POST /api/public/chat──► API ──► Google Gemini (key in backend/.env only)

Browser ──► portal (Next, client components) ──Bearer JWT──► /api/* ──► PostgreSQL
                                                                 ├──► Resend (email)
                                                                 ├──► Stripe (checkout, portal, payouts)
                                                                 └──► uploads/ (local media driver) or Cloudflare R2 (unused today)

Stripe ──POST /api/donations/webhook (raw body, signature checked)──► API
```

- **Response envelope** for every API route: `{ success: true, data, meta? }` or `{ success: false, message, errors?: [{ field, message }] }`. Both frontends share this contract (`frontend/src/lib/api.ts`, `backoffice/src/lib/api.ts`).
- **Auth**: `POST /api/auth/login` returns an 8-hour JWT. The portal stores it in cookie `brhw_admin_session`; `backoffice/src/proxy.ts` redirects to `/login` without it; the API re-checks the JWT and the user's `status` on every request (`middlewares/auth.middleware.js`). Optional TOTP two-factor.
- **Roles**: `super_admin`, `editor`, `read_only`. Content write = editor and above. Site settings, users, system, audit, donation settings and the Request Assistance inbox = Super Admin only. Donations list = Super Admin + Read-only. The sidebar mirrors this in `backoffice/src/lib/nav.ts`.
- **Localized text** is a JSONB object `{ en, fr, es }` everywhere (`backend/utils/localized.js` normalises it; `pick()` falls back to English). Lists are `{ en: [], fr: [], es: [] }`.
- **Public copy** has two layers: the built-in message files (`frontend/src/messages/{en,fr,es}.json`) and per-key overrides saved from the portal's Pages editor (`pages` table, published version). `frontend/src/i18n/request.ts` lays the overrides over the base. `backend/config/pageSchema.js` declares which message keys and image slots each page section exposes.
- **Media**: `backend/services/media.service.js` accepts images/PDF up to 15 MB and MP4/WebM/MOV up to 200 MB, makes WebP variants `thumb` 400 / `medium` 900 / `large` 1600, and stores through `storage.service.js` (local `backend/uploads/` served at `/uploads/*`; switches to R2 automatically if the `R2_*` keys are set, which they are not). Public payloads use `mediaSummary()`.
- **Email**: `services/email.service.js` calls Resend's HTTP API. Without a key outside production it prints the email to the console; in production it throws. Every attempt is logged to `email_logs` (portal → System → Email log).
- **Donations**: `services/donations.service.js` + `stripe.service.js`. Mode is derived from the key: `sk_live` = live, `sk_test` = test, no key = simulated (refused when `NODE_ENV=production`). One-time gifts use Checkout `mode: payment`; monthly gifts use `mode: subscription` and each invoice becomes a ledger row with its own receipt number `BRHW-…`. Receipts are PDF + email in the donor's language (`receipts.service.js`). Fee cover (gross-up) exists but is **off by default** pending Desmond's decision.
- **AI assistant**: `services/chat.service.js` builds a system prompt from the published content (site settings, programs, published metrics, team, donation settings, page URLs, plus the "extra knowledge" text from the portal) and calls Gemini over REST (`GEMINI_MODEL`, default `gemini-2.5-flash`). Rules in the prompt: answer only from the facts, never invent numbers or dates, not an emergency service, no medical/legal/financial advice, stay on topic. Conversations are stored (`chat_sessions`, `chat_messages`, IP hashed) and readable in the portal (Site → AI assistant, Super Admin). Rate limit 40 turns / 10 min per IP; a 429 from Gemini is retried once, then surfaces as 503 "busy". The widget is hidden when the key is missing or the switch is off.
- **Audit**: every write goes through `utils/audit.record(req, { action, entity, entityId, before, after })`. It never throws.
- **Backups**: `npm run backup` (`scripts/backup.js` → `services/backup.service.js`) writes a content JSON export, a `pg_dump -Fc` and a tar of uploads, prunes after `BACKUP_KEEP_DAYS`, and writes a status JSON the System screen reads.
- **Seeding**: on first start the API seeds site settings, programs, team, metrics, pages and legal pages from `backend/seed/messages/*.json`, which must stay **byte-identical** to `frontend/src/messages/*.json` (they are today; copy after every message change). `npm run seed:admin` creates the first Super Admin from `SEED_ADMIN_*` and is idempotent.

---

## 5. Conventions per app

### 5.1 API (`backend/`)

```
server.js            connect, run migrations, ensure defaults, listen (HOST=127.0.0.1 on the server)
app.js               helmet, CORS (CLIENT_URLS), Stripe webhook with raw body BEFORE express.json, /uploads static, /api routes
config/              env.js (all variables, with defaults) · content.js (LOCALES, PAGE_SLUGS, NAV_ITEMS, icon lists) · pageSchema.js · formFields.js · database.js
migrations/          001-create-users … 010-impact-stories-and-hero — numbered, umzug, auto-applied at startup and by `npm run migrate`
models/              one file per domain, registered + associated in models/index.js
validators/          express-validator rule sets; `validate` middleware turns failures into the errors[] array
controllers/         asyncHandler + ok()/ApiError; `apply(row, body)` pattern for create/update; serialize() for output
routes/              staff routers (authenticate + authorize) and public.routes.js (no auth, rate-limited where it writes)
services/            email, media, storage, stripe, donations, receipts, notifications, translations, backup, content.seed, siteMessages, turnstile
utils/               apiResponse, apiError, asyncHandler, audit, localized, csv, pagination, sanitize, tokens, totp
```

Rules of thumb:
- New table = new numbered migration with `up` **and** `down`, then the model, then add it to `models/index.js`, then to `buildContentExport()` in `backup.service.js` if it is editorial content.
- Validation belongs in `validators/*.js` (shape) **and** in the controller's `apply()` (business rules such as "a video entry needs a file or a link"). Throw `ApiError.badRequest(message, [{ field, message }])` so the portal can show the field reason.
- Public endpoints return only what the site needs (no storage keys, no uploader, no timestamps unless used) and set `Cache-Control: public, max-age=30`.
- Keep `config/content.js` in sync with `backoffice/src/lib/content.ts` and with the site's `lib/site-config.ts` when you add a page or nav item. `siteSettings.controller.js` inserts new nav keys at their default position for existing rows.
- `NODE_ENV=production` refuses the email and payment fallbacks. Local production-style runs use `NODE_ENV=staging`.

### 5.2 Website (`frontend/`)

```
src/app/[locale]/…/page.tsx     one folder per public page; every page exists under /en /fr /es (localePrefix: always)
src/app/api/messages/[locale]   built-in copy for the portal's Pages editor
src/app/api/preview, preview/exit  Draft Mode entry/exit, protected by PREVIEW_SECRET
src/proxy.ts                    next-intl middleware (locale detection)
src/i18n/                       routing.ts (locales), request.ts (messages + overrides), navigation.ts (Link, useRouter — ALWAYS use these, never next/link)
src/lib/cms.ts                  SERVER-ONLY reader of /api/public/* (imports next/headers). getSiteSettings, getPrograms, getTeam, getImpact, getGallery, getLegalPage, getPageContent, getDonationConfig, pickText, mediaSrc, orderSections, pageImage
src/lib/site-config.ts          org identity (no street address), nav + footer link lists
src/components/site/…           page sections; PageSections renders blocks in the order/visibility the portal saved
src/components/forms/…          the five forms (zod schemas in lib/zod-schemas/forms.ts, honeypot field "website" hidden)
src/messages/{en,fr,es}.json    all copy, namespaced (Meta, Nav, Hero, About, GalleryPage, …)
src/app/globals.css             brand tokens (--brand-purple-*, --brand-coral-*), fonts, all page CSS
```

Rules of thumb:
- **Client components must not import `@/lib/cms`** (it pulls `next/headers` and the build fails). Import types with `import type` and copy the tiny helper you need (see `GalleryGrid.tsx`).
- A new page needs: the route folder, `PageProps<"/[locale]/x">` typing (run `npx next typegen` after adding routes), messages in **all three** files, `Meta.xTitle/xDescription`, a `Nav.x` label, an entry in `site-config.ts` nav/footer lists, a `pageSchema.js` entry (sections + image slots), the slug in `PAGE_SLUGS` and `NAV_ITEMS`, and a copy of the messages into `backend/seed/messages`.
- Every string on the site is a message key. No hard-coded English in JSX.
- Brand colours from Site settings are applied by `components/site/BrandStyle.tsx` (emits shades via `color-mix()` only when a colour differs from the defaults `#5626a6` / `#f26058`).
- Images: `next/image` with `remotePatterns` for localhost and any HTTPS host. `ALLOW_LOCAL_IMAGE_HOST=true` is only for a production-mode run on one PC, never on the server.
- Public data is cached 30 s (ISR). After changing content in the portal, wait up to 30 s or hit the page twice.
- `eslint-config-next` 16 ships the React Compiler rules, including `react-hooks/set-state-in-effect`: reset state by remounting with a `key`, not by `setState` inside `useEffect`. Fetch-then-set inside a promise callback is fine.

### 5.3 Portal (`backoffice/`)

```
src/app/(auth)/…                login, forgot/reset password, accept invite
src/app/(dashboard)/…           one page.tsx per screen; layout.tsx reads the sidebar cookie server-side
src/app/(dashboard)/[...slug]   placeholder for screens listed in lib/modules.ts but not built
src/components/<area>/XView.tsx the screen itself ("use client"); page.tsx only renders PageHeader + the view
src/components/content/         shared editors: LocalizedInput, LocaleTabs, MediaPicker (kind all | image | pdf | video), RichTextEditor (Tiptap), ConfirmDialog, SortControls
src/components/layout/          AppSidebar (collapse button, cookie), AppHeader, EnvBadge (NEXT_PUBLIC_STRIPE_MODE), DemoNotice
src/lib/api.ts                  api.get/post/patch/put/delete + ApiError(status, message, errors[])
src/lib/auth.ts                 session cookie + user profile; demo mode when NEXT_PUBLIC_API_URL is empty
src/lib/nav.ts                  sidebar groups + role gating (canSee)
src/lib/types.ts                every API type the UI uses — add yours here
src/lib/content.ts              mirror of backend/config/content.js
src/lib/sidebar-cookie.ts       plain module (no "use client") so the server layout can import the constant
```

Rules of thumb:
- Screen pattern: load with `api.get` in a `useEffect`, keep `items` in state, edit in a `Sheet` keyed by the item id (`key={editing.id}`) so the form remounts instead of syncing state in effects, show errors with `errorMessage(err)` (joins `errors[].message`), success with `toast.success`.
- Gate writes with `useSessionUser()` (`canEdit = role === "super_admin" || role === "editor"`); the API enforces it anyway.
- Do **not** rely on `useSearchParams` + Suspense for deep links: it never hydrates in the hidden pane used for verification. Read `searchParams` in the server `page.tsx` and pass an `initialId` prop.
- Constants imported by the server layout must live in a module without `"use client"` (otherwise they become client references and the cookie is never honoured).
- Everything in the portal is English only (staff tool); the content it edits is trilingual.

---

## 6. Running locally (Windows workstation, also fine on macOS/Linux)

Prerequisites: Node 22, PostgreSQL 16 with a database `be_real_humanitarian`. Copy the three env examples and fill them:

```bash
cd backend && cp .env.example .env          # DB_*, JWT_SECRET, PREVIEW_SECRET, SEED_ADMIN_EMAIL/PASSWORD (10+ chars)
cd ../frontend && cp .env.example .env.local
cd ../backoffice && cp .env.example .env.local
```

Development (three terminals):

```bash
cd backend && npm install && npm run seed:admin && npm run dev      # nodemon, :4000, migrations + content seed on start
cd frontend && npm install && npm run dev                            # :3000
cd backoffice && npm install && npm run dev                          # :3001
```

Production-style on one PC (optimized builds; the API in `NODE_ENV=staging` so emails print to the log and donations use the simulated checkout when keys are empty):

```powershell
.\start-production.ps1            # add -Rebuild after code changes
.\stop-production.ps1
```

Logs land in `.prod-api.log`, `.prod-web.log`, `.prod-backoffice.log` at the root. If a port is stuck, kill the listener by port (`Get-NetTCPConnection -LocalPort 3000`) before restarting; `taskkill` errors are easy to mask in PowerShell.

Workstation gotchas seen so far:
- Git Bash sometimes loses `/usr/bin` from PATH; prefix commands with `export PATH="/usr/bin:/bin:/mingw64/bin:/c/Program Files/nodejs:/c/Program Files/Git/cmd:$PATH"`.
- `psql` is not on PATH; use the backend's `pg` client from a Node one-liner instead.
- `next build` takes 2–3 minutes per app here; run builds in the background and keep working.
- For visual proof, headless Chrome works: `chrome.exe --headless=new --screenshot=out.png --window-size=1280,2400 <url>` then crop with `sharp` (the backend has it installed).

Sign-in: the local Super Admin is whatever `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` were when `seed:admin` ran. Invite and reset emails print in the API log until `RESEND_API_KEY` is set.

---

## 7. Testing a change

There is no automated test suite. What exists and what to do:

- `npm run lint` in `frontend/` and `backoffice/` (ESLint 9 + React Compiler rules) must pass. `npm run build` in both must pass (typed routes catch bad links).
- API smoke checks are ad-hoc Node scripts hitting `/api/*` with a login token (the recurring-gift work shipped with a 27-check script; write a similar one for anything non-trivial and keep it out of the repo or under `deploy/` only if reusable).
- Donations: locally with empty Stripe keys the whole flow runs in **simulated** mode (`/donate/simulate` page, `POST /api/public/donations/simulate/complete` and `/refund`), including receipts and the ledger. Never test with live keys.
- Emails: with a Resend key, use the portal's System → Email log to confirm delivery; without it, read the API log.
- Check all three locales for anything user-facing, and the mobile layout for anything in the website.
- Before saying "done": lint + build green, the change verified in the browser (screenshot), the tracker updated, secrets absent from the diff.

---

## 8. Deployment (VPS)

| Item | Value |
|---|---|
| Host | Ubuntu 24.04, `root@31.97.53.16` (password held by Michel; ends with a dot) |
| App dir | `/var/www/bereal` (clone of `main`) |
| Processes | pm2: `bereal-api` (127.0.0.1:4000, `NODE_ENV=production`), `bereal-web` (:3002), `bereal-backoffice` (:3003) — `deploy/vps/ecosystem.config.js` |
| nginx | `/etc/nginx/sites-available/bereal-org` (from `deploy/vps/nginx-berealhumanitarian.org.conf`, TLS by certbot, cert name `bereal-org`); `bereal` holds the old nip.io names as redirects (cert `bereal-nip`). API vhost allows 210 MB bodies for gallery videos |
| Database | PostgreSQL 16 local, db `be_real_humanitarian`, role `bereal` |
| Media | local driver, `/var/www/bereal/backend/uploads` |
| Backups | `/var/backups/bereal` (14 days), cron `/etc/cron.d/bereal-backup` daily 03:15 UTC, log `/var/log/bereal-backup.log` |
| Env files | `backend/.env`, `frontend/.env.local`, `backoffice/.env.local` on the server only |
| Domain switch | done on 2026-09-12; flag `/var/www/bereal/.domain-switched` (do not run `switch-domain.sh` again) |

Release procedure (every time):

```bash
# on the PC: commit, then
git push origin main
# on the server:
bash /var/www/bereal/deploy/vps/deploy.sh
```

`deploy.sh` does: `git pull --ff-only`, `npm ci` in the three apps, `npm run migrate`, `npm run seed:admin` (no-op if the admin exists), `next build` ×2, `pm2 startOrReload --update-env`, installs the backup cron, `nginx -t && reload`. It **never touches data**. Because bash reads the script while it runs, a release that changes `deploy.sh` itself may need a second run for the new steps.

Operational notes:
- Env changes: edit the file on the server, then `pm2 restart bereal-api --update-env` (or all three).
- Logs: `pm2 logs bereal-api --lines 200`. Health: `curl -s https://api.berealhumanitarian.org/health` (expects `"env":"production"`).
- Over an SSH one-shot (plink), never `pkill -f`/`pgrep -f` a script name: it matches the SSH shell and kills your session. Run long tasks in the foreground or with `nohup … &`.
- Restore from backup: `pg_restore -d be_real_humanitarian db-YYYY-MM-DD.dump`, untar the uploads archive into `backend/`, `pm2 restart bereal-api`.
- Rollback: `git -C /var/www/bereal checkout <good commit>` then `bash deploy.sh --no-pull`; migrations only roll back with `npm run migrate:down` and only one step at a time, so prefer forward fixes.
- Windows side: `plink -batch -hostkey <SHA256 fingerprint> -pwfile <temp file>` and delete the password file right after. Never echo the password into a command line that gets logged.

---

## 9. Third-party services (state on 2026-09-14)

- **Stripe** — live since 2026-09-14. Live secret/publishable keys and the webhook signing secret are in the server's `backend/.env`; the portal badge reads `NEXT_PUBLIC_STRIPE_MODE=live` from `backoffice/.env.local`. The webhook endpoint (`/api/donations/webhook`) is registered in the Stripe dashboard with the checkout, charge, invoice and subscription events; a customer-portal configuration exists for donors to update cards. Idempotency via the `stripe_events` table. The end-to-end live test ($1 gift → thank-you page → receipt email → ledger → payout) is Desmond's to run; after it, the secret key that was shared in chat should be rolled in the Stripe dashboard and replaced on the server.
- **Resend** — sending domain `berealhumanitarian.org` verified (EU region). DNS at Hostinger: TXT `resend._domainkey`, CNAMEs `rsend` and `send`. Hostinger also hosts a mailbox on the same domain; leave its MX/records alone. The key is send-only. `EMAIL_FROM` is `no-reply@berealhumanitarian.org`. Rotate the key after launch.
- **Hostinger** — registrar + DNS (A records `@`, `portal`, `api` → the VPS; `www` CNAME → apex).
- **Google Gemini** — AI assistant key in the server's `backend/.env` (`GEMINI_API_KEY`), Google AI Studio project owned by Michel. On the free tier the quota is about ten requests per minute and a few hundred per day for the whole site; enable billing on the project before promoting the chat. Change the model with `GEMINI_MODEL`.
- **Cloudflare R2** — not used; local media driver + daily backup instead. Setting the `R2_*` keys would switch storage transparently but existing URLs would need rewriting.
- **Cloudflare Turnstile** — not configured; forms rely on the hidden honeypot field `website` plus rate limiting.

---

## 10. Recipe: adding a feature end to end

Worked example to copy: the gallery (commits `5f5f815` and `6c77e9d`). In order:

1. **Migration** `backend/migrations/009-<name>.js` (`up` + `down`, indexes), model in `backend/models/`, register + associate in `models/index.js`, add to `buildContentExport()` if editorial.
2. **Validator** rules in `backend/validators/`, **controller** with `apply()` / `serialize()` / audit, **routes**: staff router in `routes/content.routes.js` (or a new file mounted in `routes/index.js`), public read in `routes/public.routes.js`.
3. If it is a new public page: `PAGE_SLUGS` + `NAV_ITEMS` in `config/content.js`, section schema in `config/pageSchema.js`.
4. **Portal**: type in `lib/types.ts`, `components/<area>/<Name>View.tsx`, `app/(dashboard)/<path>/page.tsx`, nav item in `lib/nav.ts` with the right roles, `lib/content.ts` mirror if vocab changed.
5. **Website**: type + getter in `lib/cms.ts`, section component(s), route folder with `generateMetadata`, messages in `en/fr/es.json` (all three, plus `Meta.*` and `Nav.*`), `site-config.ts` links, CSS in `globals.css`, `npx next typegen`.
6. Copy the three message files to `backend/seed/messages/`.
7. `npm run lint` + `npm run build` in both Next apps; smoke-test the API; verify in the browser in EN/FR/ES; screenshot.
8. Tracker row in `doc/backoffice-features.md` (§12), then commit with a plain descriptive subject, then deploy when asked.

Smaller changes follow the relevant subset. Content-only changes (wording, photos) should be done **in the portal**, not in code, unless the built-in fallback copy must change too.

---

## 11. Open items handed over (as of 2026-09-14)

Waiting on Desmond / Michel, not on code:
- Live Stripe end-to-end test with a $1 gift, then roll the secret key.
- Rotate the Resend API key after launch.
- Desmond turns off the leftover 2FA on the seeded Super Admin himself (My account → Security), creates the real admin account and deletes the test admin.
- Notification recipients per form (Site → Notifications) are empty; staff alerts are only logged until set.
- Public email and phone are unset (Contact hides the rows).
- Privacy Policy and Terms are unpublished (site returns 404 for them and the forms hide the privacy link).
- Fee-cover switch (Donation settings → Processing fees) stays off until Desmond decides.
- Native FR/ES review of the copy (Translations screen has the worksheet export/import).
- Real photos for the site; the gallery's Calvary entry needs its real date.

Local-only leftovers: the local database holds test gallery entries (a YouTube test video and an AI sample image) that were never sent live.

---

## 12. Documents and where they live

| Document | Location | Notes |
|---|---|---|
| Feature tracker | `doc/backoffice-features.md` | gitignored, Michel's PC. Phases A–E ✅, then rows P1…P14 for post-launch work. Add a row per feature: number, name, status, dated notes with the commit hash |
| Backoffice scope | `doc/backoffice-scope.md` | what every screen must do, role matrix, donation flow |
| Website specification | `doc/Be Real Humanitarian Works - Website Specification (EN).docx` | source of the copy and the governance rules |
| Content brief | `doc/Be_Real_Humanitarian_Works_Website_Content_Brief.docx` | |
| Deployment runbook | `README.md` §Deployment and `deploy/vps/*` | in the repo |

When you finish a task, leave the next agent what you would have wanted: the tracker row, a commit message that says what changed and why, and no secrets anywhere.
