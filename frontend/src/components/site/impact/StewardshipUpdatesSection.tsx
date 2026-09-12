import { useFormatter, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import type { UpdateView } from "@/lib/impact-view";

// Dated notes on how gifts and resources were used (Impact screen). Renders
// nothing until the first update is published.
export function StewardshipUpdatesSection({ updates }: { updates: UpdateView[] }) {
  const t = useTranslations("ImpactPage.updates");
  const format = useFormatter();
  if (updates.length === 0) return null;

  return (
    <section id="stewardship" className="section section--lavender wave-section wave-top wave-bottom scroll-mt-24">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("intro")}</p>
        </FadeIn>

        <ol className="update-list">
          {updates.map((update, index) => (
            <FadeIn key={update.id} delay={index * 0.05}>
              <li className="update-item">
                <time dateTime={update.date}>{format.dateTime(new Date(`${update.date}T12:00:00Z`), { dateStyle: "long" })}</time>
                <div>
                  <h3>{update.title}</h3>
                  <div className="rich-text" dangerouslySetInnerHTML={{ __html: update.body }} />
                </div>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  );
}
