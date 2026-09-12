import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

export function NewsletterSection() {
  const t = useTranslations("ContactPage.newsletter");

  return (
    <section id="newsletter" className="newsletter scroll-mt-24">
      <div className="site-container newsletter__grid">
        <FadeIn>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead mt-3">{t("body")}</p>
        </FadeIn>
        <FadeIn delay={0.06} className="form-card">
          <NewsletterForm />
        </FadeIn>
      </div>
    </section>
  );
}
