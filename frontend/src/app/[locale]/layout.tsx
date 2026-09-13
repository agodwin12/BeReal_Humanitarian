import type { Metadata } from "next";
import { Caveat, Nunito_Sans, Roboto } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";

import { Header } from "@/components/site/Header";
import { BrandStyle } from "@/components/site/BrandStyle";
import { Footer } from "@/components/site/Footer";
import { PreviewBanner } from "@/components/site/PreviewBanner";
import { routing } from "@/i18n/routing";
import { getLegalPage, getSiteSettings, mediaSrc, pickText } from "@/lib/cms";

// Type system (per Michel): Caacupe One for h1 (loaded via CSS @import in
// globals.css — not in next/font/google's list yet), Roboto for h2+,
// Nunito Sans for body/nav/buttons, Caveat for the handwritten notes.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: "Meta" }), getSiteSettings()]);
  const description = t("description") || pickText(settings?.seoDescription, locale);
  const share = settings?.shareImage;
  return {
    title: t("title"),
    description,
    openGraph: {
      title: t("title"),
      description,
      siteName: settings?.legalName,
      locale,
      images: share ? [{ url: mediaSrc(share, "large"), width: share.width ?? undefined, height: share.height ?? undefined, alt: pickText(share.alt, locale) }] : undefined,
    },
    icons: settings?.favicon ? { icon: settings.favicon.url } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Site settings (navigation, donate switch, socials, address…) come from the
  // backoffice; the built-in config is the fallback while the API is unset.
  const [settings, privacy, terms] = await Promise.all([getSiteSettings(), getLegalPage("privacy-policy"), getLegalPage("terms")]);
  // Footer links to a legal page only once its first version is published.
  const legalHrefs = [privacy?.isPublished ? "/privacy-policy" : null, terms?.isPublished ? "/terms" : null].filter((href): href is string => href !== null);
  const nav = settings ? settings.navigation.filter((n) => n.visible).map((n) => ({ key: n.key, href: n.href })) : undefined;

  return (
    <html
      lang={locale}
      className={`${roboto.variable} ${nunitoSans.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BrandStyle settings={settings} />
        <NextIntlClientProvider>
          <div className="site-shell flex flex-1 flex-col">
            <PreviewBanner locale={locale} />
            <Header
              nav={nav}
              donateEnabled={settings?.donateEnabled ?? true}
              enabledLocales={settings?.enabledLocales}
              legalName={settings?.legalName}
              logoSrc={settings?.logo ? mediaSrc(settings.logo, "thumb") : undefined}
            />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} legalHrefs={legalHrefs} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
