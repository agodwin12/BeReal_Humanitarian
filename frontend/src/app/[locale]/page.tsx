import { setRequestLocale } from "next-intl/server";

import { CtaBand } from "@/components/site/CtaBand";
import { HeroSection } from "@/components/site/HeroSection";
import { ImpactSection } from "@/components/site/ImpactSection";
import { PageSections } from "@/components/site/PageSections";
import { ProgramsSection } from "@/components/site/ProgramsSection";
import { WelcomeSection } from "@/components/site/WelcomeSection";
import { getPageContent, getSiteSettings, mediaSrc, pageImage, pickText } from "@/lib/cms";
import { getProgramsView } from "@/lib/programs-view";

const SECTIONS = ["hero", "welcome", "programs", "impact", "cta"] as const;

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, settings, programs] = await Promise.all([getPageContent("home"), getSiteSettings(), getProgramsView(locale)]);
  const donateEnabled = settings?.donateEnabled ?? true;

  // Hero carousel: the photos chosen in Site settings, in order; until at
  // least one is chosen, the page falls back to its single default photo.
  const heroImages =
    settings?.heroSlides && settings.heroSlides.length > 0
      ? settings.heroSlides.map((media) => ({ src: mediaSrc(media, "large"), alt: pickText(media.alt, locale) }))
      : [pageImage(content, "hero", "/images/hero-outreach.jpg", locale)];

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <HeroSection images={heroImages} donateEnabled={donateEnabled} />,
        // Default photo: volunteers sorting food donations, by Joel Muniz on
        // Unsplash (unsplash.com/photos/3k3l2brxmwQ) — free Unsplash license,
        // not a photo of this organization's own outreach.
        welcome: <WelcomeSection image={pageImage(content, "welcome", "/images/welcome-community-food-sorting.jpg", locale)} />,
        programs: <ProgramsSection programs={programs} />,
        impact: <ImpactSection />,
        cta: <CtaBand />,
      }}
    />
  );
}
