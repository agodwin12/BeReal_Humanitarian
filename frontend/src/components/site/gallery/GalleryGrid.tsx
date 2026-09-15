"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, PlayCircle, X } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { CmsGalleryItem, CmsMedia } from "@/lib/cms";

// Local copies of two tiny helpers: lib/cms.ts pulls in next/headers, which a
// client component must not import.
const pickText = (value: CmsGalleryItem["title"] | undefined | null, locale: string, fallback = "") => (value ? (value as Record<string, string | undefined>)[locale] || value.en || fallback : fallback);
const mediaSrc = (media: CmsMedia, size: "thumb" | "medium" | "large" = "large") => media.variants?.[size]?.url ?? media.url;

// Photo and video cards, newest event first. A photo opens full size in a
// lightbox; an uploaded video plays inline; a YouTube / Vimeo link embeds.
// `showHeader` / `showStoryLinks` are turned off when this grid is embedded
// inside an Impact story's own page (its own header already introduces the
// photos, and a link back to the same page would be circular).
export function GalleryGrid({ items, showHeader = true, showStoryLinks = true }: { items: CmsGalleryItem[]; showHeader?: boolean; showStoryLinks?: boolean }) {
  const t = useTranslations("GalleryPage.grid");
  const locale = useLocale();
  const format = useFormatter();
  const [open, setOpen] = useState<CmsGalleryItem | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const date = (value: string | null) => (value ? format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "long" }) : null);

  return (
    <section id={showHeader ? "gallery" : undefined} className={showHeader ? "section scroll-mt-24" : "section pt-0"}>
      <div className="site-container">
        {showHeader ? (
          <FadeIn className="section-intro">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2 className="section-title">{t("title")}</h2>
            <p className="lead">{t("intro")}</p>
          </FadeIn>
        ) : null}

        {items.length === 0 ? (
          <FadeIn className="info-card border-line mx-auto max-w-2xl text-center">
            <p className="m-0">{t("empty")}</p>
          </FadeIn>
        ) : (
          <div className="gallery-grid">
            {items.map((item, index) => {
              const title = pickText(item.title, locale);
              const description = pickText(item.description, locale);
              const alt = item.media ? pickText(item.media.alt, locale, title) : title;
              const when = date(item.happenedOn);
              return (
                <FadeIn key={item.id} delay={Math.min(index, 8) * 0.05} className="gallery-card">
                  {item.kind === "video" ? (
                    <div className="gallery-card__media gallery-card__media--video">
                      {item.media ? (
                        <video controls preload="metadata" playsInline src={item.media.url} className="size-full object-cover" aria-label={alt} />
                      ) : item.embedUrl ? (
                        <iframe src={item.embedUrl} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                      ) : null}
                    </div>
                  ) : item.media ? (
                    <button type="button" className="gallery-card__media gallery-card__button" onClick={() => setOpen(item)} aria-label={`${t("open")}: ${title}`}>
                      <Image src={mediaSrc(item.media, "medium")} alt={alt} fill sizes="(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 33vw" className="object-cover" />
                    </button>
                  ) : null}
                  <div className="gallery-card__body">
                    <div className="gallery-card__meta">
                      <span className="gallery-card__kind">{item.kind === "video" ? <PlayCircle className="size-3.5" aria-hidden="true" /> : null}{item.kind === "video" ? t("video") : t("photo")}</span>
                      {when ? (
                        <span className="gallery-card__date">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          <time dateTime={item.happenedOn ?? undefined}>{when}</time>
                        </span>
                      ) : null}
                      {item.location ? (
                        <span className="gallery-card__date">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {item.location}
                        </span>
                      ) : null}
                    </div>
                    <h3>{title}</h3>
                    {description ? <p>{description}</p> : null}
                    {showStoryLinks && item.impactStory ? (
                      <Link href={`/impact/stories/${item.impactStory.slug}`} className="gallery-card__story-link">
                        {t("viewStory")} →
                      </Link>
                    ) : null}
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>

      {open && open.media ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={pickText(open.title, locale)} onClick={() => setOpen(null)}>
          <button type="button" className="lightbox__close" onClick={() => setOpen(null)} aria-label={t("close")}>
            <X className="size-5" />
          </button>
          <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc(open.media, "large")} alt={pickText(open.media.alt, locale, pickText(open.title, locale))} className="lightbox__image" />
            <figcaption className="lightbox__caption">
              <strong>{pickText(open.title, locale)}</strong>
              {date(open.happenedOn) ? <span> · {date(open.happenedOn)}</span> : null}
              {pickText(open.description, locale) ? <p>{pickText(open.description, locale)}</p> : null}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </section>
  );
}
