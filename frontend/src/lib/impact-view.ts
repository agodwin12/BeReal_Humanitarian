import { getTranslations } from "next-intl/server";

import { getImpact, mediaSrc, pickText, type PageImage } from "@/lib/cms";
import { impactMetrics } from "@/lib/content/impactMetrics";

// Impact page data: metrics (value only when published with a documented-on
// date), stories (published + consent confirmed) and stewardship updates.
export type MetricView = { key: string; icon: string; label: string; value: string | null; documentedOn: string | null };
export type StoryView = { id: number; title: string; body: string; image: PageImage | null };
export type UpdateView = { id: number; date: string; title: string; body: string };

export type ImpactView = { metrics: MetricView[]; stories: StoryView[]; updates: UpdateView[] };

export async function getImpactView(locale: string): Promise<ImpactView> {
  const t = await getTranslations({ locale, namespace: "ImpactPage.metrics.items" });
  const api = await getImpact();

  if (api) {
    return {
      metrics: api.metrics.map((m) => ({ key: m.key, icon: m.icon, label: pickText(m.label, locale), value: m.value, documentedOn: m.documentedOn })),
      stories: api.stories
        .map((s) => ({
          id: s.id,
          title: pickText(s.title, locale),
          body: pickText(s.body, locale),
          image: s.media ? { src: mediaSrc(s.media, "medium"), alt: pickText(s.media.alt, locale) } : null,
        }))
        .filter((s) => s.title && s.body),
      updates: api.updates
        .map((u) => ({ id: u.id, date: u.date, title: pickText(u.title, locale), body: pickText(u.body, locale) }))
        .filter((u) => u.title && u.body),
    };
  }

  return {
    metrics: impactMetrics.map((m) => ({ key: m.key, icon: m.icon, label: t(m.key), value: m.value, documentedOn: null })),
    stories: [],
    updates: [],
  };
}
