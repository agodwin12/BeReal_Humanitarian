import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { UnsubscribeStatus } from "@/components/site/newsletter/UnsubscribeStatus";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/unsubscribe">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Unsubscribe" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: PageProps<"/[locale]/unsubscribe">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Unsubscribe" });
  const tokenValue = typeof token === "string" && token.length > 0 ? token : null;

  return (
    <section className="section">
      <div className="site-container mx-auto max-w-3xl">
        <div className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="section-title">{t("title")}</h1>
          <p className="lead">{t("lead")}</p>
        </div>
        <UnsubscribeStatus token={tokenValue} />
      </div>
    </section>
  );
}
