import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";

const STEPS = ["s1", "s2", "s3"] as const;

// The order is the point: submit → review → response (no timelines promised).
export function ProcessSection() {
  const t = useTranslations("AssistancePage.steps");

  return (
    <section className="section section--lavender wave-section wave-top wave-bottom">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
        </FadeIn>
        <div className="steps">
          {STEPS.map((step, index) => (
            <FadeIn key={step} delay={index * 0.07} className="step">
              <div className="step__num" aria-hidden="true">
                {index + 1}
              </div>
              <div>
                <h3>{t(`${step}.title`)}</h3>
                <p>{t(`${step}.body`)}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
