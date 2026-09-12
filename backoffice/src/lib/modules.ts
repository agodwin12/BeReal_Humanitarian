import type { Role } from "@/lib/nav";

export type Phase = "A" | "B" | "C" | "D";

export type ModuleDef = {
  title: string;
  description: string;
  phase: Phase;
  roles?: Role[];
  capabilities: string[];
};

export const PHASES: Record<Phase, string> = {
  A: "Foundation — login, roles, dashboard shell, audit log",
  B: "Money & inbox — donations, submissions, subscribers",
  C: "Content — settings, pages, programs, impact, team, media, legal",
  D: "Translations & polish — translation tooling, exports, 2FA",
};

// One entry per screen in doc/backoffice-scope.md §4. Until a module is built
// the catch-all route renders it as a placeholder listing these capabilities,
// so the whole backoffice is navigable and reviewable from day one.
export const modules: Record<string, ModuleDef> = {
  "/donations": {
    title: "Donations",
    description: "Every gift received through Stripe, mirrored from webhooks. Stripe holds the money and the cards; this is the ledger.",
    phase: "B",
    roles: ["super_admin", "read_only"],
    capabilities: [
      "Totals and charts: today, month, year, all-time; by language, amount band, and page",
      "Gross vs. net after Stripe fees (fees are absorbed by the organization)",
      "Payouts to the bank: paid out vs. in transit (read from Stripe)",
      "List with search (name, email, receipt #, Stripe ID) and filters (date, status, amount, language)",
      "Donation detail with timeline: created → paid → receipt emailed → refunded",
      "Resend receipt, download receipt PDF, open in Stripe, internal note, anonymous flag",
      "Refunds initiated in Stripe flow back automatically via webhooks",
      "CSV / Excel export, including per fiscal year (Jan 1 – Dec 31)",
      "Donor lookup by email — all gifts and receipts, never card data",
    ],
  },
  "/donations/settings": {
    title: "Donation settings",
    description: "How the public Donate page and receipts behave. Super Admin only.",
    phase: "B",
    roles: ["super_admin"],
    capabilities: [
      "Suggested amounts, minimum amount, currency (USD)",
      "Thank-you page message per language (EN / FR / ES)",
      "Receipt wording per language: intro, IRS statement, sign-off, sender name, reply-to",
      "Receipt identity (logo, legal name, EIN, address) pulled from Site settings",
      "Stripe connection: test / live keys, webhook status, last event, statement descriptor",
      "Kill switch: hide the Donate button site-wide with a friendly message",
    ],
  },
  "/inbox/volunteer": {
    title: "Volunteer interest",
    description: "Submissions from the Get Involved page volunteer form.",
    phase: "B",
    capabilities: [
      "Read each submission with language, date, and source page",
      "Status workflow: New → In review → Contacted → Closed, with notes and assignment",
      "Reply by email, export CSV by date range",
      "Spam quarantine for honeypot / Turnstile catches",
      "Notification settings: who is alerted, in which language",
    ],
  },
  "/inbox/partnership": {
    title: "Partnership inquiries",
    description: "Submissions from the Get Involved page partnership form.",
    phase: "B",
    capabilities: [
      "Organization, contact, type, proposal, and message at a glance",
      "Status workflow with notes and assignment",
      "Reply by email, export CSV",
      "Spam quarantine and notification settings",
    ],
  },
  "/inbox/assistance": {
    title: "Request assistance",
    description: "Requests from people in hardship. Restricted to Super Admin and handled with extra care.",
    phase: "B",
    roles: ["super_admin"],
    capabilities: [
      "Super Admin only — no other role can open this inbox",
      "Status workflow: New → In review → Contacted → Closed, with notes",
      "Preferred contact method, assistance type, urgency, and deadline highlighted",
      "Close and archive; restricted export",
      "No sensitive fields are ever collected (no SSN, banking, passwords, medical records)",
    ],
  },
  "/inbox/contact": {
    title: "General contact",
    description: "Messages from the Contact page form.",
    phase: "B",
    capabilities: [
      "Read, triage, and assign messages",
      "Status workflow with notes",
      "Reply by email, export CSV",
      "Spam quarantine and notification settings",
    ],
  },
  "/inbox/newsletter": {
    title: "Newsletter subscribers",
    description: "Email sign-ups with consent records.",
    phase: "B",
    capabilities: [
      "Email, language, consent timestamp, source page, status",
      "Manual unsubscribe; one-click unsubscribe links in every email",
      "Export CSV; later: sync to Resend audiences or Mailchimp",
    ],
  },
  "/content/pages": {
    title: "Pages",
    description: "Every text and photo on Home, About, Programs, Impact, Get Involved, Request Assistance, Donate, Contact, Privacy, and Terms.",
    phase: "C",
    capabilities: [
      "Edit every section's copy with EN / FR / ES tabs side by side",
      "Swap any photo from the media library; alt text per language is required",
      "Reorder or hide sections without a developer",
      "Per-page SEO: title, description, social image, per language",
      "Draft, preview, publish; version history with restore",
    ],
  },
  "/content/programs": {
    title: "Programs",
    description: "Be Real Health & Hope, Be Real Care, Be Real Empowerment, Faith & Community Outreach — and any added later.",
    phase: "C",
    capabilities: [
      "Name, purpose, focus items, icon, card photo, detail photo — all localized",
      "Order and visibility",
      "Changes appear on the homepage cards and Programs page at once",
    ],
  },
  "/content/impact": {
    title: "Impact",
    description: "Documented metrics, stories with consent, and stewardship updates.",
    phase: "C",
    capabilities: [
      "Five committed metrics with value, documented-on date, source note, and publish toggle",
      "Unpublished metrics keep the public placeholder — no unverified number can go live",
      "Stories with a mandatory consent confirmation before publishing",
      "Dated stewardship updates on how funds were used",
    ],
  },
  "/content/team": {
    title: "Team",
    description: "Board members and staff shown on the About page.",
    phase: "C",
    capabilities: [
      "Name, role and bio per language, display order",
      "Photo publication approval per person (date + who confirmed)",
    ],
  },
  "/content/media": {
    title: "Media library",
    description: "Photos, the logo, and PDFs stored on Cloudflare R2.",
    phase: "C",
    capabilities: [
      "Upload with automatic web-size versions",
      "Alt text per language (required), caption, credit, consent-on-file flag",
      "See where each image is used; replace everywhere in one step; delete only when unused",
    ],
  },
  "/content/legal": {
    title: "Legal pages",
    description: "Privacy Policy and Terms / Website Disclaimer.",
    phase: "C",
    capabilities: [
      "Rich-text editor per language",
      "Effective date and version number; previous versions kept",
    ],
  },
  "/settings/site": {
    title: "Site settings",
    description: "Identity, contact details, compliance text, navigation, languages, SEO defaults.",
    phase: "C",
    roles: ["super_admin"],
    capabilities: [
      "Legal name, short name, tagline per language, logo, favicon, brand colors",
      "Public email, phone, mailing address and its 'mail only' note, social links",
      "501(c)(3) status line, EIN display, political-neutrality statement, fiscal year",
      "Header and footer navigation order; Donate button on/off",
      "Enabled languages (EN always on; FR / ES can be hidden until approved)",
      "SEO defaults: title pattern, description, share image per language",
    ],
  },
  "/translations": {
    title: "Translations",
    description: "Every text field on the site with its EN / FR / ES status.",
    phase: "D",
    capabilities: [
      "Status per field: translated, machine-drafted (needs review), missing",
      "Filter by page and status; translator worksheet export and import (CSV)",
      "Mark 'reviewed by native speaker' — the FR / ES launch checklist",
    ],
  },
  "/users": {
    title: "Users & roles",
    description: "Who can sign in and what they can do.",
    phase: "A",
    roles: ["super_admin"],
    capabilities: [
      "Invite by email, assign Super Admin / Editor / Read-only, deactivate",
      "Force password reset; optional two-factor authentication for Super Admins",
    ],
  },
  "/system": {
    title: "System",
    description: "Health of the pieces behind the site.",
    phase: "A",
    roles: ["super_admin"],
    capabilities: [
      "Environment indicator (TEST / LIVE) — always visible in the header",
      "Stripe webhook log: events received and processed",
      "Email delivery log: receipts and notifications — sent / bounced",
      "API health and database backup status",
    ],
  },
  "/system/audit": {
    title: "Audit log",
    description: "Every login and every change, searchable.",
    phase: "A",
    roles: ["super_admin"],
    capabilities: [
      "Who, what, when, before / after for each change",
      "Filter by user, module, and date",
    ],
  },
};

export function getModule(pathname: string): ModuleDef | undefined {
  return modules[pathname];
}
