import Image from "next/image";
import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import type { StoryView } from "@/lib/impact-view";

// Stories appear only after staff confirmed the person's consent and
// published them (Impact screen). Nothing renders while the list is empty.
export function ImpactStoriesSection({ stories }: { stories: StoryView[] }) {
  const t = useTranslations("ImpactPage.stories");
  if (stories.length === 0) return null;

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
              {story.image ? (
                <div className="story-card__media image-container">
                  <Image src={story.image.src} alt={story.image.alt ?? ""} fill sizes="(max-width: 900px) 100vw, 33vw" className="object-cover" />
                </div>
              ) : null}
              <div className="story-card__body">
                <h3>{story.title}</h3>
                <div className="rich-text" dangerouslySetInnerHTML={{ __html: story.body }} />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
