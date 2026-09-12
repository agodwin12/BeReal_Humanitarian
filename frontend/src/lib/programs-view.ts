import { getTranslations } from "next-intl/server";

import { getPrograms, mediaSrc, pickList, pickText, type PageImage } from "@/lib/cms";
import { programs as staticPrograms } from "@/lib/content/programs";
import { programDetails } from "@/lib/content/programDetails";

// One shape for every program renderer (home cards, Programs page, quick nav):
// from the API when the backoffice has content, otherwise the launch copy.
export type ProgramView = {
  slug: string;
  icon: string;
  tint: "lavender" | "coral";
  line1: string;
  line2: string;
  summary: string;
  name: string;
  purpose: string;
  focusItems: string[];
  card: PageImage;
  detail: PageImage;
};

const ITEM_KEYS = ["item1", "item2", "item3", "item4"] as const;

export async function getProgramsView(locale: string): Promise<ProgramView[]> {
  const t = await getTranslations({ locale, namespace: "Programs.items" });
  const tp = await getTranslations({ locale, namespace: "ProgramsPage.programs" });

  // Built-in photos + alt text, keyed by the launch slugs.
  const staticBySlug = new Map<string, { card: PageImage; detail: PageImage }>(
    staticPrograms.map((p) => {
      const detail = programDetails.find((d) => d.slug === p.slug);
      return [
        p.slug,
        {
          card: { src: p.photo, alt: t(`${p.slug}.alt`) } as PageImage,
          detail: { src: detail?.photo ?? p.photo, alt: tp(`${p.slug}.alt`) } as PageImage,
        },
      ];
    }),
  );

  const api = await getPrograms();
  if (api && api.length > 0) {
    return api.map((p) => {
      const fallback = staticBySlug.get(p.slug);
      const name = pickText(p.name, locale);
      return {
        slug: p.slug,
        icon: p.icon,
        tint: p.tint,
        line1: pickText(p.cardLine1, locale),
        line2: pickText(p.cardLine2, locale, name),
        summary: pickText(p.summary, locale),
        name,
        purpose: pickText(p.purpose, locale),
        focusItems: pickList(p.focusItems, locale),
        card: p.cardMedia
          ? { src: mediaSrc(p.cardMedia, "medium"), alt: pickText(p.cardMedia.alt, locale, name) }
          : (fallback?.card ?? { src: "/images/cta-community.png", alt: name }),
        detail: p.detailMedia
          ? { src: mediaSrc(p.detailMedia, "large"), alt: pickText(p.detailMedia.alt, locale, name) }
          : (fallback?.detail ?? fallback?.card ?? { src: "/images/cta-community.png", alt: name }),
      };
    });
  }

  return programDetails.map((d) => {
    const fallback = staticBySlug.get(d.slug)!;
    return {
      slug: d.slug,
      icon: d.icon,
      tint: d.tint,
      line1: t(`${d.slug}.line1`),
      line2: t(`${d.slug}.line2`),
      summary: t(`${d.slug}.purpose`),
      name: tp(`${d.slug}.name`),
      purpose: tp(`${d.slug}.purpose`),
      focusItems: ITEM_KEYS.map((key) => tp(`${d.slug}.${key}`)),
      card: fallback.card,
      detail: fallback.detail,
    };
  });
}
