import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalArticle } from "@/components/site/LegalArticle";
import { getLegalPage, pickText } from "@/lib/cms";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy-policy">): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "Nav" }), getLegalPage("privacy-policy")]);
  return { title: `${pickText(page?.title, locale) || t("privacy")} — Be Real Humanitarian Works Inc.` };
}

export default async function PrivacyPolicyPage({ params }: PageProps<"/[locale]/privacy-policy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "Nav" }), getLegalPage("privacy-policy")]);

  // No placeholder page: the route exists only once staff published a version.
  if (!page?.isPublished) notFound();

  return (
    <LegalArticle
      title={pickText(page.title, locale) || t("privacy")}
      body={pickText(page.body, locale)}
      effectiveDate={page.effectiveDate ?? null}
      version={page.version}
    />
  );
}
