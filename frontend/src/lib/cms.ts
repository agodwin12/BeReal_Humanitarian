import { cache } from "react";
import { draftMode } from "next/headers";

// Server-side reader for the content API (backend /api/public/*). Every helper
// returns null when the API is unreachable or unset, and every caller falls
// back to the built-in launch copy — the site never breaks because the API is
// down. Draft Mode (staff preview) switches to unpublished content.

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const PREVIEW_SECRET = process.env.PREVIEW_SECRET ?? "";

export const cmsEnabled = Boolean(API_URL);

export type Locale = "en" | "fr" | "es";
export type Localized = Partial<Record<Locale, string>>;
export type LocalizedList = Partial<Record<Locale, string[]>>;

export type CmsMedia = {
  id: number;
  url: string;
  width: number | null;
  height: number | null;
  variants: Partial<Record<"thumb" | "medium" | "large", { url: string; width: number; height: number }>>;
  alt: Localized;
  caption: Localized;
  credit: string | null;
};

export type NavEntry = { key: string; href: string; visible: boolean };
export type SocialLink = { platform: string; url: string };

export type SiteSettings = {
  legalName: string;
  shortName: string;
  tagline: Localized;
  statusLine: Localized;
  neutralityStatement: Localized;
  fiscalYear: Localized;
  ein: string | null;
  showEin: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  addressNote: Localized;
  socialLinks: SocialLink[];
  navigation: NavEntry[];
  donateEnabled: boolean;
  donateDisabledMessage: Localized;
  enabledLocales: Locale[];
  brandPrimary: string | null;
  brandAccent: string | null;
  seoDescription: Localized;
  logo: CmsMedia | null;
  favicon: CmsMedia | null;
  shareImage: CmsMedia | null;
};

export type CmsProgram = {
  id: number;
  slug: string;
  icon: string;
  tint: "lavender" | "coral";
  name: Localized;
  cardLine1: Localized;
  cardLine2: Localized;
  summary: Localized;
  purpose: Localized;
  focusItems: LocalizedList;
  cardMedia: CmsMedia | null;
  detailMedia: CmsMedia | null;
};

export type CmsTeamMember = { id: number; name: string; role: Localized; bio: Localized; photo: CmsMedia | null };

export type CmsImpact = {
  metrics: { key: string; icon: string; label: Localized; value: string | null; documentedOn: string | null }[];
  stories: { id: number; title: Localized; body: Localized; media: CmsMedia | null; publishedAt: string | null }[];
  updates: { id: number; date: string; title: Localized; body: Localized }[];
};

export type CmsLegalPage = {
  slug: string;
  title: Localized;
  body: Localized;
  effectiveDate: string | null;
  version: number;
  isPublished: boolean;
};

export type PageContent = { slug: string; sections: { key: string; visible: boolean }[]; images: Record<string, CmsMedia> };

export type DonationConfig = {
  enabled: boolean;
  disabledMessage: Localized;
  currency: string;
  suggestedAmounts: number[];
  minimumAmountCents: number;
  maximumAmountCents: number;
  thankYouMessage: Localized;
  monthly: { enabled: boolean; suggestedAmounts: number[] };
  feeCover: { enabled: boolean; percentBp: number; fixedCents: number; defaultChecked: boolean };
  mode: "live" | "test" | "simulated";
};

export type CmsGalleryItem = {
  id: number;
  kind: "image" | "video";
  media: (CmsMedia & { mimeType?: string }) | null;
  videoUrl: string | null;
  embedUrl: string | null;
  title: Localized;
  description: Localized;
  happenedOn: string | null;
  location: string | null;
  published: boolean;
};

export function pickText(value: Localized | undefined | null, locale: string, fallback = ""): string {
  if (!value) return fallback;
  return value[locale as Locale] || value.en || fallback;
}

export function pickList(value: LocalizedList | undefined | null, locale: string): string[] {
  if (!value) return [];
  const list = value[locale as Locale];
  return list && list.length ? list : (value.en ?? []);
}

export function mediaSrc(media: CmsMedia, size: "thumb" | "medium" | "large" = "large") {
  return media.variants?.[size]?.url ?? media.url;
}

// Staff preview (Next Draft Mode) → unpublished content, uncached.
export const isPreview = cache(async () => {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
});

async function cmsFetch<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  const draft = await isPreview();
  const url = `${API_URL}/api/public${path}${draft ? `${path.includes("?") ? "&" : "?"}draft=1` : ""}`;
  try {
    const response = await fetch(
      url,
      draft ? { cache: "no-store", headers: { "x-preview-token": PREVIEW_SECRET } } : { next: { revalidate: 30 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export const getSiteSettings = cache(() => cmsFetch<SiteSettings>("/site-settings"));
export const getPrograms = cache(() => cmsFetch<CmsProgram[]>("/programs"));
export const getTeam = cache(() => cmsFetch<CmsTeamMember[]>("/team"));
export const getImpact = cache(() => cmsFetch<CmsImpact>("/impact"));
export const getGallery = cache(() => cmsFetch<CmsGalleryItem[]>("/gallery"));
export const getLegalPage = cache((slug: string) => cmsFetch<CmsLegalPage>(`/legal/${slug}`));
export const getDonationConfig = cache(() => cmsFetch<DonationConfig>("/donations/config"));

export const getPageContent = cache(async (slug: string): Promise<PageContent> => {
  const content = await cmsFetch<PageContent>(`/pages/${slug}`);
  return content ?? { slug, sections: [], images: {} };
});

export const getMessageOverrides = cache(async (locale: string): Promise<Record<string, string>> => {
  const data = await cmsFetch<{ messages: Record<string, string> }>(`/messages/${locale}`);
  return data?.messages ?? {};
});

// Section keys to render, in the editor's order, hidden ones removed. Keys the
// editor does not know about (new components) render last in their default order.
export function orderSections<K extends string>(content: PageContent, defaults: readonly K[]): K[] {
  const known = new Set<string>(defaults);
  const result: K[] = [];
  for (const entry of content.sections) {
    if (!known.has(entry.key) || result.includes(entry.key as K)) continue;
    if (entry.visible) result.push(entry.key as K);
  }
  const mentioned = new Set(content.sections.map((s) => s.key));
  for (const key of defaults) if (!mentioned.has(key)) result.push(key);
  return result;
}

export type PageImage = { src: string; alt?: string; width?: number; height?: number };

export function pageImage(content: PageContent, slot: string, fallbackSrc: string, locale: string): PageImage {
  const media = content.images?.[slot];
  if (!media) return { src: fallbackSrc };
  return { src: mediaSrc(media, "large"), alt: pickText(media.alt, locale) || undefined, width: media.width ?? undefined, height: media.height ?? undefined };
}
