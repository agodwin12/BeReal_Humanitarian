import { useFormatter, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import { metricIcon } from "@/components/site/program-icons";
import type { MetricView } from "@/lib/impact-view";

// Governance rule (brief Section 8): never show fabricated figures. The API
// only returns a value once staff published it with a documented-on date;
// metrics without one are simply not shown, and the whole section stays off
// the page until the first figure is published (no placeholder cards).
export function ImpactMetricsSection({ metrics }: { metrics: MetricView[] }) {
  const t = useTranslations("ImpactPage.metrics");
  const format = useFormatter();
  const published = metrics.filter((metric) => metric.value);

  if (published.length === 0) return null;

  return (
    <section className="section">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("intro")}</p>
        </FadeIn>

        <div className="grid-5">
          {published.map((metric, index) => {
            const Icon = metricIcon(metric.icon);
            return (
              <FadeIn key={metric.key} delay={index * 0.06} className="metric-card">
                <div className="metric-card__icon">
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <div className="metric-card__value" aria-hidden="true">
                  {metric.value}
                </div>
                <h3>{metric.label}</h3>
                {metric.documentedOn ? (
                  <p>{t("documentedOn", { date: format.dateTime(new Date(`${metric.documentedOn}T12:00:00Z`), { dateStyle: "long" }) })}</p>
                ) : null}
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
