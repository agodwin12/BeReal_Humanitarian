import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FadeIn } from "@/components/motion/FadeIn";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { ContactDetails } from "@/components/site/contact/ContactDetails";
import { NewsletterSection } from "@/components/site/contact/NewsletterSection";
import { ContactForm } from "@/components/forms/ContactForm";
import { getPageContent, getSiteSettings, pageImage, type PageImage, type SiteSettings } from "@/lib/cms";

const SECTIONS = ["hero", "message", "newsletter", "cta"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("contactTitle"), description: t("contactDescription") };
}

function ContactHero({ image }: { image: PageImage }) {
  const t = useTranslations("ContactPage");
  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      image={image.src}
      imageAlt={image.alt ?? t("heroAlt")}
      imagePosition="object-[center_40%]"
    />
  );
}

function ContactSection({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("ContactPage.form");
  return (
    <section id="message" className="section scroll-mt-24">
      <div className="site-container contact-grid">
        <FadeIn>
          <ContactDetails settings={settings} />
        </FadeIn>
        <FadeIn delay={0.06}>
          <div className="section-intro">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2 className="section-title">{t("title")}</h2>
            <p className="lead">{t("intro")}</p>
          </div>
          <div className="form-card">
            <ContactForm />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, settings] = await Promise.all([getPageContent("contact"), getSiteSettings()]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <ContactHero image={pageImage(content, "hero", "/images/contact-hero.png", locale)} />,
        message: <ContactSection settings={settings} />,
        newsletter: <NewsletterSection />,
        cta: <CtaBand />,
      }}
    />
  );
}
