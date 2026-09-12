import { useFormatter, useTranslations } from "next-intl";
import { FileText } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";

// Privacy Policy / Terms body from the Legal pages editor (already sanitized
// by the API). Until the first version is published the page says so instead
// of showing placeholder legal text.
export function LegalArticle({
  title,
  body,
  effectiveDate,
  version,
  published,
}: {
  title: string;
  body: string;
  effectiveDate: string | null;
  version: number;
  published: boolean;
}) {
  const t = useTranslations("LegalPage");
  const format = useFormatter();

  return (
    <section className="section">
      <div className="site-container legal-article">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{title}</h1>
          {published && effectiveDate ? (
            <p className="legal-meta">
              {t("effective", { date: format.dateTime(new Date(`${effectiveDate}T12:00:00Z`), { dateStyle: "long" }) })}
              <span aria-hidden="true"> · </span>
              {t("version", { version })}
            </p>
          ) : null}
        </FadeIn>

        {published && body ? (
          <FadeIn delay={0.04}>
            <article className="rich-text rich-text--legal" dangerouslySetInnerHTML={{ __html: body }} />
          </FadeIn>
        ) : (
          <FadeIn delay={0.04} className="info-card border-line">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-brand-purple-600" strokeWidth={2} />
              <p className="m-0">{t("pending")}</p>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
