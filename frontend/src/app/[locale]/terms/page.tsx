import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalArticle } from "@/components/site/LegalArticle";
import { getLegalPage, pickText } from "@/lib/cms";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "Nav" }), getLegalPage("terms")]);
  return { title: `${pickText(page?.title, locale) || t("terms")} — Be Real Humanitarian Works Inc.` };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "Nav" }), getLegalPage("terms")]);

  // No placeholder page: the route exists only once staff published a version.
  if (!page?.isPublished) notFound();

  return (
    <LegalArticle
      title={pickText(page.title, locale) || t("terms")}
      body={pickText(page.body, locale)}
      effectiveDate={page.effectiveDate ?? null}
      version={page.version}
    />
  );
}
