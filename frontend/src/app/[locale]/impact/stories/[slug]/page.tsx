import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { ImpactStoryDetail } from "@/components/site/impact/ImpactStoryDetail";
import { getImpactStory, mediaSrc, pickText } from "@/lib/cms";

export async function generateMetadata({ params }: PageProps<"/[locale]/impact/stories/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = await getImpactStory(slug);
  if (!story) return {};
  const title = pickText(story.title, locale);
  const description = pickText(story.summary, locale).replace(/<[^>]+>/g, "").slice(0, 200) || pickText(story.purpose, locale);
  return {
    title: `${title} — Be Real Humanitarian Works Inc.`,
    description,
    openGraph: story.media ? { title, description, images: [{ url: mediaSrc(story.media, "large") }] } : undefined,
  };
}

export default async function ImpactStoryPage({ params }: PageProps<"/[locale]/impact/stories/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, story] = await Promise.all([getTranslations({ locale, namespace: "ImpactPage.storyDetail" }), getImpactStory(slug)]);
  if (!story) notFound();

  const title = pickText(story.title, locale);
  const lead = [story.location, story.happenedOn].filter(Boolean).join(" · ") || pickText(story.purpose, locale).replace(/<[^>]+>/g, "").slice(0, 140);

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={title}
        lead={lead}
        image={story.media ? mediaSrc(story.media, "large") : "/images/impact-hero.png"}
        imageAlt={story.media ? pickText(story.media.alt, locale, title) : title}
        imagePosition="object-[center_40%]"
      />
      <ImpactStoryDetail
        programName={story.program ? pickText(story.program.name, locale) : null}
        happenedOn={story.happenedOn}
        location={story.location}
        peopleReachedCount={story.peopleReachedCount}
        peopleReachedUnit={pickText(story.peopleReachedUnit, locale, t("peopleReachedFallbackUnit"))}
        purpose={pickText(story.purpose, locale)}
        whatWeDid={pickText(story.whatWeDid, locale)}
        assistanceProvided={story.assistanceProvided?.[locale as "en" | "fr" | "es"] ?? story.assistanceProvided?.en ?? []}
        galleryItems={story.galleryItems}
      />
      <CtaBand />
    </>
  );
}
