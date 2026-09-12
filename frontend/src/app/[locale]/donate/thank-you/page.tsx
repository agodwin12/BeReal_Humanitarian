import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ThankYou } from "@/components/site/donate/ThankYou";
import { getDonationConfig, pickText } from "@/lib/cms";

export async function generateMetadata({ params }: PageProps<"/[locale]/donate/thank-you">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DonatePage.thankYou" });
  return { title: `${t("title")} — Be Real Humanitarian Works Inc.`, robots: { index: false, follow: false } };
}

export default async function ThankYouPage({ params, searchParams }: PageProps<"/[locale]/donate/thank-you">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const session = typeof query.session === "string" ? query.session : null;
  const [t, config] = await Promise.all([getTranslations({ locale, namespace: "DonatePage.thankYou" }), getDonationConfig()]);

  return (
    <section className="section">
      <div className="site-container mx-auto max-w-3xl">
        <div className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{t("title")}</h1>
        </div>
        <ThankYou session={session} message={pickText(config?.thankYouMessage, locale)} />
      </div>
    </section>
  );
}
