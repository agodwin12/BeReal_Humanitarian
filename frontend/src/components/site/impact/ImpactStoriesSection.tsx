import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { StoryView } from "@/lib/impact-view";

// Case studies of completed outreach (Impact = "what we have accomplished").
// A story appears only after staff confirmed consent and published it.
export function ImpactStoriesSection({ stories }: { stories: StoryView[] }) {
  const t = useTranslations("ImpactPage.stories");
  const format = useFormatter();
  if (stories.length === 0) return null;

  const when = (value: string | null) => (value ? format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "long" }) : null);

  return (
    <section id="stories" className="section scroll-mt-24">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("intro")}</p>
        </FadeIn>

        <div className="story-grid">
          {stories.map((story, index) => (
            <FadeIn key={story.id} delay={index * 0.06} className="story-card">
              <Link href={`/impact/stories/${story.slug}`} className="story-card__link" aria-label={`${t("viewStory")}: ${story.title}`}>
                {story.image ? (
                  <div className="story-card__media image-container">
                    <Image src={story.image.src} alt={story.image.alt ?? ""} fill sizes="(max-width: 900px) 100vw, 33vw" className="object-cover" />
                  </div>
                ) : null}
                <div className="story-card__body">
                  {story.programName ? <span className="story-card__program">{t("partOf", { program: story.programName })}</span> : null}
                  <h3>{story.title}</h3>
                  <div className="story-card__meta">
                    {when(story.happenedOn) ? (
                      <span>
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {when(story.happenedOn)}
                      </span>
                    ) : null}
                    {story.location ? (
                      <span>
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {story.location}
                      </span>
                    ) : null}
                    {story.peopleReachedCount ? (
                      <span>
                        <Users className="size-3.5" aria-hidden="true" />
                        {story.peopleReachedCount} {story.peopleReachedUnit || t("peopleReachedFallbackUnit")}
                      </span>
                    ) : null}
                  </div>
                  {story.summary ? <div className="rich-text story-card__summary" dangerouslySetInnerHTML={{ __html: story.summary }} /> : null}
                  <span className="story-card__cta">
                    {t("viewStory")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
