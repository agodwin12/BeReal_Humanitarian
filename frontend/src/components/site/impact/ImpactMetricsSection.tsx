import { useFormatter, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import { metricIcon } from "@/components/site/program-icons";
import type { MetricView } from "@/lib/impact-view";

// Governance rule (brief Section 8): never show fabricated figures. The API
// only returns a value once staff published it with a documented-on date;
// anything else renders the "reporting begins…" state instead of a number.
export function ImpactMetricsSection({ metrics }: { metrics: MetricView[] }) {
  const t = useTranslations("ImpactPage.metrics");
  const format = useFormatter();

  return (
    <section className="section">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("intro")}</p>
        </FadeIn>

        <div className="grid-5">
          {metrics.map((metric, index) => {
            const Icon = metricIcon(metric.icon);
            return (
              <FadeIn key={metric.key} delay={index * 0.06} className="metric-card">
                <div className="metric-card__icon">
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <div className="metric-card__value" aria-hidden="true">
                  {metric.value ?? "—"}
                </div>
                <h3>{metric.label}</h3>
                <p>
                  {metric.value
                    ? metric.documentedOn
                      ? t("documentedOn", { date: format.dateTime(new Date(`${metric.documentedOn}T12:00:00Z`), { dateStyle: "long" }) })
                      : metric.value
                    : t("pending")}
                </p>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
