import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { ImpactMetricsSection } from "@/components/site/impact/ImpactMetricsSection";
import { ImpactPrinciplesSection } from "@/components/site/impact/ImpactPrinciplesSection";
import { ImpactStoriesSection } from "@/components/site/impact/ImpactStoriesSection";
import { StewardshipUpdatesSection } from "@/components/site/impact/StewardshipUpdatesSection";
import { getPageContent, pageImage, type PageImage } from "@/lib/cms";
import { getImpactView } from "@/lib/impact-view";

const SECTIONS = ["hero", "metrics", "stories", "updates", "principles", "cta"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/impact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("impactTitle"), description: t("impactDescription") };
}

function ImpactHero({ image }: { image: PageImage }) {
  const t = useTranslations("ImpactPage");
  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      image={image.src}
      imageAlt={image.alt ?? t("heroAlt")}
      imagePosition="object-[center_45%]"
    />
  );
}

export default async function ImpactPage({ params }: PageProps<"/[locale]/impact">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, impact] = await Promise.all([getPageContent("impact"), getImpactView(locale)]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <ImpactHero image={pageImage(content, "hero", "/images/outreach-impact-hero-v2.jpg", locale)} />,
        metrics: <ImpactMetricsSection metrics={impact.metrics} />,
        stories: <ImpactStoriesSection stories={impact.stories} />,
        updates: <StewardshipUpdatesSection updates={impact.updates} />,
        principles: <ImpactPrinciplesSection image={pageImage(content, "principles", "/images/outreach-principles.jpg", locale)} />,
        cta: <CtaBand />,
      }}
    />
  );
}
