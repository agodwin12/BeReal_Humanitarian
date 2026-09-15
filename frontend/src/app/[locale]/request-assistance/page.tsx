import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { ProcessSection } from "@/components/site/request-assistance/ProcessSection";
import { AssistanceForm } from "@/components/forms/AssistanceForm";
import { Link } from "@/i18n/navigation";
import { getLegalPage, getPageContent, pageImage, type PageImage } from "@/lib/cms";

const SECTIONS = ["hero", "steps", "form", "otherHelp"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/request-assistance">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("assistanceTitle"), description: t("assistanceDescription") };
}

function AssistanceHero({ image }: { image: PageImage }) {
  const t = useTranslations("AssistancePage");
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

function FormSection({ privacyPublished }: { privacyPublished: boolean }) {
  const t = useTranslations("AssistancePage");
  return (
    <section id="request" className="section scroll-mt-24">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("form.eyebrow")}</span>
          <h2 className="section-title">{t("form.title")}</h2>
          <p className="lead">{t("form.intro")}</p>
        </FadeIn>

        <FadeIn delay={0.04} className="mb-4 grid gap-3 lg:grid-cols-2">
          <div className="info-card border-line">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand-purple-600" strokeWidth={2} />
              <div>
                <h3 className="m-0 mb-1 text-base font-bold text-brand-purple-950">{t("emergency.title")}</h3>
                <p>{t("emergency.body")}</p>
              </div>
            </div>
          </div>
          <div className="info-card border-line">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-purple-600" strokeWidth={2} />
              <div>
                <h3 className="m-0 mb-1 text-base font-bold text-brand-purple-950">{t("privacy.title")}</h3>
                <p>{t("privacy.body")}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="form-card">
          <AssistanceForm privacyPublished={privacyPublished} />
        </FadeIn>
      </div>
    </section>
  );
}

function OtherHelp() {
  const t = useTranslations("AssistancePage.otherHelp");
  return (
    <section className="section section--lavender wave-section wave-top">
      <div className="site-container">
        <FadeIn className="section-intro">
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("body")}</p>
        </FadeIn>
        <FadeIn delay={0.06} className="flex flex-wrap gap-3">
          <Button asChild variant="purple" size="lg">
            <Link href="/programs">
              {t("programs")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline-purple" size="lg">
            <Link href="/contact">{t("contact")}</Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );
}

export default async function RequestAssistancePage({
  params,
}: PageProps<"/[locale]/request-assistance">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, privacy] = await Promise.all([getPageContent("request-assistance"), getLegalPage("privacy-policy")]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <AssistanceHero image={pageImage(content, "hero", "/images/outreach-health-hope.jpg", locale)} />,
        steps: <ProcessSection />,
        form: <FormSection privacyPublished={Boolean(privacy?.isPublished)} />,
        otherHelp: <OtherHelp />,
      }}
    />
  );
}
