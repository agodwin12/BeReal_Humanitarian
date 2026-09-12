import { useFormatter, useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";

// Privacy Policy / Terms body from the Legal pages editor (already sanitized
// by the API). Only rendered for a published version — the routes answer 404
// and the footer hides the link until the first version is published.
export function LegalArticle({
  title,
  body,
  effectiveDate,
  version,
}: {
  title: string;
  body: string;
  effectiveDate: string | null;
  version: number;
}) {
  const t = useTranslations("LegalPage");
  const format = useFormatter();

  return (
    <section className="section">
      <div className="site-container legal-article">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{title}</h1>
          {effectiveDate ? (
            <p className="legal-meta">
              {t("effective", { date: format.dateTime(new Date(`${effectiveDate}T12:00:00Z`), { dateStyle: "long" }) })}
              <span aria-hidden="true"> · </span>
              {t("version", { version })}
            </p>
          ) : null}
        </FadeIn>

        <FadeIn delay={0.04}>
          <article className="rich-text rich-text--legal" dangerouslySetInnerHTML={{ __html: body }} />
        </FadeIn>
      </div>
    </section>
  );
}
