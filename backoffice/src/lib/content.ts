import type { Locale, Localized, LocalizedList } from "@/lib/types";

// Mirrors backend/config/content.js — keep in sync.
export const LOCALES: Locale[] = ["en", "fr", "es"];

export const LOCALE_NAME: Record<Locale, string> = { en: "English", fr: "French", es: "Spanish" };
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", fr: "FR", es: "ES" };

export const PROGRAM_ICONS = ["heart-pulse", "hand-heart", "graduation-cap", "users", "hand-helping", "sprout", "home", "book-open", "stethoscope", "package"] as const;
export const PROGRAM_ICON_LABEL: Record<(typeof PROGRAM_ICONS)[number], string> = {
  "heart-pulse": "Heart pulse (health)",
  "hand-heart": "Hand & heart (care)",
  "graduation-cap": "Graduation cap (education)",
  users: "People (community)",
  "hand-helping": "Helping hand",
  sprout: "Sprout (growth)",
  home: "Home",
  "book-open": "Open book",
  stethoscope: "Stethoscope",
  package: "Package (supplies)",
};

export const PROGRAM_TINTS = ["lavender", "coral"] as const;

export const METRIC_ICONS = ["users", "package", "map-pin", "clock", "wallet", "heart", "sprout", "home"] as const;

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "youtube", "x", "linkedin", "tiktok", "whatsapp"] as const;
export const SOCIAL_LABEL: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export const NAV_LABEL: Record<string, string> = {
  home: "Home",
  about: "About",
  programs: "Programs",
  impact: "Impact",
  getInvolved: "Get Involved",
  requestAssistance: "Request Assistance",
  contact: "Contact",
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PREVIEW_SECRET = process.env.NEXT_PUBLIC_PREVIEW_SECRET ?? "";

export function siteUrl(path: string, locale: Locale = "en") {
  return `${SITE_URL}/${locale}${path === "/" ? "" : path}`;
}

// Opens the public site in Draft Mode (unpublished content) — see
// frontend/src/app/api/preview/route.ts.
export function previewUrl(path: string, locale: Locale = "en") {
  const target = `/${locale}${path === "/" ? "" : path}`;
  return `${SITE_URL}/api/preview?token=${encodeURIComponent(PREVIEW_SECRET)}&path=${encodeURIComponent(target)}`;
}

export const emptyLocalized = (): Localized => ({ en: "", fr: "", es: "" });
export const emptyLocalizedList = (): LocalizedList => ({ en: [], fr: [], es: [] });

export function localizedFrom(value: Localized | null | undefined): Localized {
  return { en: value?.en ?? "", fr: value?.fr ?? "", es: value?.es ?? "" };
}

export function listFrom(value: LocalizedList | null | undefined): LocalizedList {
  return { en: value?.en ?? [], fr: value?.fr ?? [], es: value?.es ?? [] };
}

// Which languages have text — drives the EN/FR/ES completeness dots.
export function localizedStatus(value: Localized | null | undefined): Record<Locale, boolean> {
  return { en: Boolean(value?.en?.trim()), fr: Boolean(value?.fr?.trim()), es: Boolean(value?.es?.trim()) };
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
