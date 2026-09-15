import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FadeIn } from "@/components/motion/FadeIn";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { ProgramDetailSection } from "@/components/site/programs/ProgramDetailSection";
import { ProgramsQuickNav } from "@/components/site/programs/ProgramsQuickNav";
import { getPageContent, pageImage, type PageImage } from "@/lib/cms";
import { getProgramsView, type ProgramView } from "@/lib/programs-view";

const SECTIONS = ["hero", "programs", "growth", "cta"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/programs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("programsTitle"), description: t("programsDescription") };
}

function ProgramsHero({ image, programs }: { image: PageImage; programs: ProgramView[] }) {
  const t = useTranslations("ProgramsPage");
  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      image={image.src}
      imageAlt={image.alt ?? t("heroAlt")}
      imagePosition="object-[center_40%]"
      actions={<ProgramsQuickNav programs={programs} />}
    />
  );
}

function GrowthNote() {
  const t = useTranslations("ProgramsPage.growth");
  return (
    <section className="section">
      <FadeIn className="site-container info-card border-line bg-brand-purple-50/60">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h2 className="section-title">{t("title")}</h2>
        <p>{t("body")}</p>
      </FadeIn>
    </section>
  );
}

export default async function ProgramsPage({
  params,
}: PageProps<"/[locale]/programs">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, programs] = await Promise.all([getPageContent("programs"), getProgramsView(locale)]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <ProgramsHero image={pageImage(content, "hero", "/images/outreach-programs-hero.jpg", locale)} programs={programs} />,
        programs: programs.map((program, index) => <ProgramDetailSection key={program.slug} program={program} index={index} />),
        growth: <GrowthNote />,
        cta: <CtaBand />,
      }}
    />
  );
}
