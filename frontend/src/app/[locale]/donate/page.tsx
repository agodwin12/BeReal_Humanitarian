import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PauseCircle } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { WhySection } from "@/components/site/donate/WhySection";
import { DonateForm } from "@/components/forms/DonateForm";
import { getDonationConfig, getPageContent, pageImage, pickText, type DonationConfig, type PageImage } from "@/lib/cms";

const SECTIONS = ["hero", "form", "why", "cta"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/donate">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("donateTitle"), description: t("donateDescription") };
}

function DonateHero({ image }: { image: PageImage }) {
  const t = useTranslations("DonatePage");
  return <PageHero eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} image={image.src} imageAlt={image.alt ?? t("heroAlt")} imagePosition="object-[center_42%]" />;
}

function FormSection({ config, cancelled, pausedMessage }: { config: DonationConfig | null; cancelled: boolean; pausedMessage: string }) {
  const t = useTranslations("DonatePage");
  const tf = useTranslations("DonatePage.form");
  return (
    <section id="give" className="section scroll-mt-24">
      <div className="site-container donate-grid">
        <FadeIn>
          <div className="section-intro">
            <span className="eyebrow">{tf("eyebrow")}</span>
            <h2 className="section-title">{tf("title")}</h2>
            <p className="lead">{tf("intro")}</p>
          </div>
          <p className="note-muted">{tf("tax")}</p>
        </FadeIn>
        <FadeIn delay={0.06}>
          {config && config.enabled ? (
            <div className="form-card">
              <DonateForm config={config} cancelled={cancelled} />
            </div>
          ) : (
            <div className="info-card border-line">
              <div className="flex items-start gap-3">
                <PauseCircle className="mt-0.5 size-5 shrink-0 text-brand-purple-600" strokeWidth={2} />
                <div>
                  <h3 className="m-0 mb-1 text-base font-bold text-brand-purple-950">{t("paused.title")}</h3>
                  <p>{pausedMessage || t("paused.body")}</p>
                </div>
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}

export default async function DonatePage({ params, searchParams }: PageProps<"/[locale]/donate">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const [content, config] = await Promise.all([getPageContent("donate"), getDonationConfig()]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <DonateHero image={pageImage(content, "hero", "/images/hero-outreach.jpg", locale)} />,
        form: <FormSection config={config} cancelled={query.cancelled === "1"} pausedMessage={pickText(config?.disabledMessage, locale)} />,
        why: <WhySection />,
        cta: <CtaBand />,
      }}
    />
  );
}
