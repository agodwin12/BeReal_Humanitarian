# Be Real Humanitarian Works — Backoffice

Staff-only admin application. Separate project and URL from the public website (planned: `admin.<domain>`), talking to the Express API in `../backend`. Scope: `../doc/backoffice-scope.md`.

Same brand tokens as the public site (purple / coral, Roboto + Nunito Sans), but flatter and denser — a dashboard, not a brochure.

## Run

```
cp .env.example .env.local   # optional; without NEXT_PUBLIC_API_URL the app runs in demo mode
npm run dev                  # http://localhost:3001 (the public site uses :3000)
```

Demo mode: any email/password signs you in as a demo Super Admin so every screen can be reviewed before the API exists.

## Structure

```
src/
├── app/
│   ├── (auth)/login/page.tsx        sign-in
│   ├── (dashboard)/layout.tsx       sidebar + header shell (protected)
│   ├── (dashboard)/page.tsx         dashboard
│   └── (dashboard)/[...slug]/       placeholder for every module not built yet
│                                    (a real module gets its own folder and wins)
├── components/
│   ├── auth/LoginForm.tsx
│   ├── layout/                      AppSidebar, AppHeader, EnvBadge, PageHeader, ModulePlaceholder
│   └── ui/                          shadcn/ui (sidebar, table, dialog, sheet, select, …)
├── lib/
│   ├── nav.ts                       sidebar groups + role gating
│   ├── modules.ts                   one entry per screen: title, phase, roles, capabilities
│   ├── auth.ts                      session cookie + user profile, login/logout, demo mode
│   └── api.ts                       fetch wrapper with bearer token
└── proxy.ts                         redirects to /login without a session cookie
```

## Roles (spec §06)

Super Admin — everything. Editor — content + non-sensitive inboxes. Read-only — view only.
Donations, donation settings, the Request Assistance inbox, users, and system screens are Super Admin only.

## Delivery phases

A foundation → B donations & inboxes → C content editing → D translations & polish. See the scope document.
