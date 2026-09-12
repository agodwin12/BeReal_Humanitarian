# Be Real Humanitarian Works — Frontend

Next.js (App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Motion). Companion to `../doc/Be Real Humanitarian Works - Website Specification (EN).docx` and `../doc/project-structure.md`. Talks to the Express API in `../backend`.

## Structure

```
src/
├── app/                default Next.js app-router files from create-next-app —
│                        the /[locale] segment + real pages are set up tomorrow
├── components/
│   ├── ui/              shadcn/ui primitives (button, card, form pieces, dialog,
│   │                    sheet, accordion, tabs, badge, navigation-menu, input,
│   │                    label, textarea, checkbox, select)
│   ├── nav/              MainNav, LanguageSwitcher
│   ├── forms/            one component per public form (Volunteer, Partnership,
│   │                    Assistance, Contact, Newsletter)
│   └── motion/           shared Motion variants (FadeIn)
├── i18n/                 next-intl routing + request config (en default, fr, es)
├── messages/             en.json / fr.json / es.json — UI-chrome strings only;
│                        page content itself comes from the backend API
└── lib/
    ├── utils.ts          shadcn's cn() helper (generated)
    ├── api.ts            fetch wrapper for the Express backend
    └── zod-schemas/      one schema per form, shared client + server validation
```

Every file we added tonight (outside of what `create-next-app` and `shadcn` generated) holds a one-line comment describing its purpose — no logic yet. The `/[locale]` routing move and `src/middleware.ts` are deliberately left for tomorrow: an empty `middleware.ts` would break `npm run dev`, since Next.js requires it to export a real middleware function.

## Before coding

1. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000` (matches the backend's default port).
2. `npm run dev` — verified tonight to boot cleanly on port 3000.

## Dependencies already installed

next, react, react-dom, typescript, tailwindcss v4 — shadcn/ui (button, card, form, dialog, sheet, accordion, tabs, badge, navigation-menu, input, label, textarea, checkbox, select) — motion, next-intl, zod, react-hook-form, @hookform/resolvers, lucide-react.

Note: the shadcn registry didn't have a standalone `form` component under that name in this version — react-hook-form + zod + @hookform/resolvers are installed and ready to use directly with the existing input/label/textarea/select components.
