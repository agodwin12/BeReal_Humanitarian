import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import { GalleryGrid } from "@/components/site/gallery/GalleryGrid";
import type { CmsGalleryItem } from "@/lib/cms";

export type ImpactStoryDetailProps = {
  programName: string | null;
  happenedOn: string | null;
  location: string | null;
  peopleReachedCount: number | null;
  peopleReachedUnit: string;
  purpose: string;
  whatWeDid: string;
  assistanceProvided: string[];
  galleryItems: CmsGalleryItem[];
};

// The Cameroon/Calvary-style case study: purpose, what was done, who it
// reached, the assistance given, and the Gallery photos/videos tagged to it.
export function ImpactStoryDetail({ programName, happenedOn, location, peopleReachedCount, peopleReachedUnit, purpose, whatWeDid, assistanceProvided, galleryItems }: ImpactStoryDetailProps) {
  const t = useTranslations("ImpactPage.storyDetail");
  const format = useFormatter();
  const when = happenedOn ? format.dateTime(new Date(`${happenedOn}T12:00:00Z`), { dateStyle: "long" }) : null;

  return (
    <section className="section">
      <div className="site-container impact-story">
        <FadeIn>
          <Link href="/impact" className="impact-story__back">
            ← {t("back")}
          </Link>
        </FadeIn>

        <FadeIn className="impact-story__meta">
          {programName ? <span className="impact-story__program">{programName}</span> : null}
          {when ? (
            <span>
              <CalendarDays className="size-4" aria-hidden="true" />
              {when}
            </span>
          ) : null}
          {location ? (
            <span>
              <MapPin className="size-4" aria-hidden="true" />
              {location}
            </span>
          ) : null}
        </FadeIn>

        {purpose ? (
          <FadeIn delay={0.04} className="impact-story__block">
            <h2>{t("purpose")}</h2>
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: purpose }} />
          </FadeIn>
        ) : null}

        {whatWeDid ? (
          <FadeIn delay={0.08} className="impact-story__block">
            <h2>{t("whatWeDid")}</h2>
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: whatWeDid }} />
          </FadeIn>
        ) : null}

        {peopleReachedCount ? (
          <FadeIn delay={0.1}>
            <div className="impact-story__stat">
              <strong>{peopleReachedCount.toLocaleString()}</strong>
              <span>{peopleReachedUnit}</span>
            </div>
          </FadeIn>
        ) : null}

        {assistanceProvided.length > 0 ? (
          <FadeIn delay={0.12} className="impact-story__block">
            <h2>{t("assistanceProvided")}</h2>
            <ul className="impact-story__list">
              {assistanceProvided.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </FadeIn>
        ) : null}
      </div>

      {galleryItems.length > 0 ? (
        <div className="site-container">
          <h2 className="impact-story__block-title">{t("gallery")}</h2>
        </div>
      ) : null}
      {galleryItems.length > 0 ? <GalleryGrid items={galleryItems} showHeader={false} showStoryLinks={false} /> : null}
    </section>
  );
}
