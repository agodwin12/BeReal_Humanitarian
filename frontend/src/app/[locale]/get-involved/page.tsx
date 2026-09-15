import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FadeIn } from "@/components/motion/FadeIn";
import { PageHero } from "@/components/site/PageHero";
import { PageSections } from "@/components/site/PageSections";
import { WaysSection } from "@/components/site/get-involved/WaysSection";
import { VolunteerForm } from "@/components/forms/VolunteerForm";
import { PartnershipForm } from "@/components/forms/PartnershipForm";
import { getPageContent, getSiteSettings, pageImage, pickText, type PageImage } from "@/lib/cms";

const SECTIONS = ["hero", "ways", "volunteerForm", "partnerForm"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/get-involved">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("getInvolvedTitle"), description: t("getInvolvedDescription") };
}

function GetInvolvedHero({ image }: { image: PageImage }) {
  const t = useTranslations("GetInvolvedPage");
  return (
    <PageHero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      image={image.src}
      imageAlt={image.alt ?? t("heroAlt")}
      imagePosition="object-[center_35%]"
    />
  );
}

function VolunteerSection() {
  const t = useTranslations("GetInvolvedPage");
  return (
    <section id="volunteer" className="section section--lavender wave-section wave-top wave-bottom scroll-mt-24">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("volunteerForm.eyebrow")}</span>
          <h2 className="section-title">{t("volunteerForm.title")}</h2>
          <p className="lead">{t("volunteerForm.intro")}</p>
        </FadeIn>
        <FadeIn delay={0.06} className="form-card">
          <VolunteerForm />
        </FadeIn>
      </div>
    </section>
  );
}

function PartnerSection() {
  const t = useTranslations("GetInvolvedPage");
  return (
    <section id="partner" className="section scroll-mt-24">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("partnerForm.eyebrow")}</span>
          <h2 className="section-title">{t("partnerForm.title")}</h2>
          <p className="lead">{t("partnerForm.intro")}</p>
        </FadeIn>
        <FadeIn delay={0.06} className="form-card">
          <PartnershipForm />
        </FadeIn>
      </div>
    </section>
  );
}

export default async function GetInvolvedPage({
  params,
}: PageProps<"/[locale]/get-involved">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [content, settings] = await Promise.all([getPageContent("get-involved"), getSiteSettings()]);

  return (
    <PageSections
      content={content}
      order={SECTIONS}
      blocks={{
        hero: <GetInvolvedHero image={pageImage(content, "hero", "/images/outreach-cta-community.jpg", locale)} />,
        ways: <WaysSection donateEnabled={settings?.donateEnabled ?? true} donateMessage={pickText(settings?.donateDisabledMessage, locale)} />,
        volunteerForm: <VolunteerSection />,
        partnerForm: <PartnerSection />,
      }}
    />
  );
}
