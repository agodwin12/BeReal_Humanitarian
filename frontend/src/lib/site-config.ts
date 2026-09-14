// Single source of truth for nav/footer links and org identity. Labels are
// message keys (see src/messages/*.json) so every link is translated.
// TODO(later): pull contact/social values from the backend's SiteSettings.

export const siteConfig = {
  orgLegalName: "Be Real Humanitarian Works Inc.",
  ein: "42-4496023",
  // Public location. The registered street address is never published on the site.
  publicLocation: "Greater Houston Area, Texas",
  // Public email and phone are [TO CONFIRM] items in the brief (Section 12).
  // Leave null until the organization supplies them — the Contact page only
  // renders these rows when a value exists, so nothing is invented.
  contactEmail: null as string | null,
  contactPhone: null as string | null,
};

export type NavKey =
  | "home"
  | "about"
  | "programs"
  | "impact"
  | "gallery"
  | "getInvolved"
  | "requestAssistance"
  | "contact"
  | "donate"
  | "privacy"
  | "terms";

export const mainNavLinks: { key: NavKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "impact", href: "/impact" },
  { key: "gallery", href: "/gallery" },
  { key: "getInvolved", href: "/get-involved" },
  { key: "requestAssistance", href: "/request-assistance" },
  { key: "contact", href: "/contact" },
];

export const footerQuickLinks: { key: NavKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "impact", href: "/impact" },
  { key: "gallery", href: "/gallery" },
];

export const footerInvolvedLinks: { key: NavKey; href: string }[] = [
  { key: "getInvolved", href: "/get-involved" },
  { key: "requestAssistance", href: "/request-assistance" },
  { key: "donate", href: "/donate" },
  { key: "contact", href: "/contact" },
];

export const footerLegalLinks: { key: NavKey; href: string }[] = [
  { key: "privacy", href: "/privacy-policy" },
  { key: "terms", href: "/terms" },
];

// Facebook is the only confirmed profile so far (per Michel, 2026-09-10).
export const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/share/17zNHepmRv/" },
];

export const leadership = [
  { name: "Desmond Nkemzi", roleKey: "founder" },
  { name: "Christian Fohtung", roleKey: "treasurer" },
  { name: "Joel Nyaghu", roleKey: "secretary" },
  { name: "Mildred Fomengia", roleKey: "director" },
  { name: "Pst Joan Emeadi", roleKey: "counselor" },
] as const;
