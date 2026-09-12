import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";

export function MissionVisionSection() {
  const t = useTranslations("About");

  return (
    <section className="section section--lavender wave-section wave-top wave-bottom">
      <div className="site-container grid-2">
        <FadeIn className="info-card">
          <span className="eyebrow">{t("mission.eyebrow")}</span>
          <h2 className="section-title">{t("mission.title")}</h2>
          <p>{t("mission.body")}</p>
        </FadeIn>
        <FadeIn delay={0.08} className="info-card">
          <span className="eyebrow">{t("vision.eyebrow")}</span>
          <h2 className="section-title">{t("vision.title")}</h2>
          <p>{t("vision.body")}</p>
        </FadeIn>
      </div>
    </section>
  );
}
