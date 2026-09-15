import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { MissionVisionSection } from "@/components/site/about/MissionVisionSection";
import { ValuesSection } from "@/components/site/about/ValuesSection";
import { FaithSection } from "@/components/site/about/FaithSection";
import { LeadershipSection } from "@/components/site/about/LeadershipSection";
import { FactsSection } from "@/components/site/about/FactsSection";
import { getPageContent, getSiteSettings, getTeam, pageImage, type PageImage } from "@/lib/cms";

const SECTIONS = ["hero", "mission", "values", "faith", "leadership", "facts", "cta"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("aboutTitle"), description: t("aboutDescription") };
}

function AboutHero({ image }: { image: PageImage }) {
  const t = useTranslations("About");
  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      image={image.src}
      imageAlt={image.alt ?? t("heroImageAlt")}
      imagePosition="object-[center_30%]"
    />
  );
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, settings, team] = await Promise.all([getPageContent("about"), getSiteSettings(), getTeam()]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <AboutHero image={pageImage(content, "hero", "/images/outreach-team-photo.jpg", locale)} />,
        mission: <MissionVisionSection />,
        values: <ValuesSection />,
        faith: <FaithSection image={pageImage(content, "faith", "/images/outreach-faith-service.jpg", locale)} />,
        leadership: <LeadershipSection members={team} />,
        facts: <FactsSection settings={settings} />,
        cta: <CtaBand />,
      }}
    />
  );
}
