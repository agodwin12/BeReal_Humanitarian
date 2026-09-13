import { useLocale, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import { pickText, type SiteSettings } from "@/lib/cms";
import { siteConfig } from "@/lib/site-config";

// Transparency & Accountability facts; legal name, EIN, fiscal year and the
// public location come from Site settings (the street address is not published).
export function FactsSection({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("About.facts");
  const locale = useLocale();

  const legalName = settings?.legalName ?? siteConfig.orgLegalName;
  const ein = settings ? (settings.showEin ? settings.ein : null) : siteConfig.ein;
  const address = settings ? settings.addressLine : siteConfig.publicLocation;
  const fiscalYear = pickText(settings?.fiscalYear, locale) || t("fiscalYearValue");

  const rows: { label: string; value: string | null }[] = [
    { label: t("legalName"), value: legalName },
    { label: t("type"), value: t("typeValue") },
    { label: t("status"), value: t("statusValue") },
    { label: t("classification"), value: t("classificationValue") },
    { label: t("ein"), value: ein },
    { label: t("fiscalYear"), value: fiscalYear },
    { label: t("scope"), value: t("scopeValue") },
    { label: t("office"), value: address },
  ];

  return (
    <section className="section section--lavender wave-section wave-top">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
        </FadeIn>

        <FadeIn delay={0.06}>
          <dl className="facts">
            {rows
              .filter((row) => row.value)
              .map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
          </dl>
        </FadeIn>
      </div>
    </section>
  );
}
