import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SimulatedCheckout } from "@/components/site/donate/SimulatedCheckout";
import { getDonationConfig } from "@/lib/cms";

// Exists only while the API runs without Stripe keys (local review).
export async function generateMetadata({ params }: PageProps<"/[locale]/donate/simulate">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DonatePage.simulate" });
  return { title: `${t("title")} — Be Real Humanitarian Works Inc.`, robots: { index: false, follow: false } };
}

export default async function SimulatePage({ params, searchParams }: PageProps<"/[locale]/donate/simulate">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const session = typeof query.session === "string" ? query.session : null;
  const config = await getDonationConfig();
  if (!session || config?.mode !== "simulated") notFound();
  const t = await getTranslations({ locale, namespace: "DonatePage.simulate" });

  return (
    <section className="section">
      <div className="site-container mx-auto max-w-2xl">
        <div className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{t("title")}</h1>
        </div>
        <SimulatedCheckout session={session} />
      </div>
    </section>
  );
}
