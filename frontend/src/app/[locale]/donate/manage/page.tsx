import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManageSubscription } from "@/components/site/donate/ManageSubscription";

// Reached from the private link in a monthly receipt email (?token=…).
export async function generateMetadata({ params }: PageProps<"/[locale]/donate/manage">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DonatePage.manage" });
  return { title: `${t("title")} — Be Real Humanitarian Works Inc.`, robots: { index: false, follow: false } };
}

export default async function ManageMonthlyGiftPage({ params, searchParams }: PageProps<"/[locale]/donate/manage">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;
  const t = await getTranslations({ locale, namespace: "DonatePage.manage" });

  return (
    <section className="section">
      <div className="site-container mx-auto max-w-2xl">
        <div className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{t("title")}</h1>
          <p className="lead">{t("lead")}</p>
        </div>
        <ManageSubscription token={token} />
      </div>
    </section>
  );
}
