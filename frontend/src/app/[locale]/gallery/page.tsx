import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { GalleryGrid } from "@/components/site/gallery/GalleryGrid";
import { getGallery, getPageContent, pageImage, type PageImage } from "@/lib/cms";

const SECTIONS = ["hero", "grid", "cta"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("galleryTitle"), description: t("galleryDescription") };
}

function GalleryHero({ image }: { image: PageImage }) {
  const t = useTranslations("GalleryPage");
  return <PageHero eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image={image.src} imageAlt={image.alt ?? t("heroAlt")} imagePosition="object-[center_40%]" />;
}

// "Our Work in Action": photos and videos of the outreach, managed on the
// portal's Gallery screen, newest event first.
export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [content, items] = await Promise.all([getPageContent("gallery"), getGallery()]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <GalleryHero image={pageImage(content, "hero", "/images/cta-community.png", locale)} />,
        grid: <GalleryGrid items={items ?? []} />,
        cta: <CtaBand />,
      }}
    />
  );
}
