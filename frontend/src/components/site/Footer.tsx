import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";

import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/icons/social";
import { Link } from "@/i18n/navigation";
import { pickText, type SiteSettings } from "@/lib/cms";
import {
  footerInvolvedLinks,
  footerLegalLinks,
  footerQuickLinks,
  siteConfig,
  socialLinks as staticSocialLinks,
} from "@/lib/site-config";

const SOCIAL_ICONS: Record<string, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
};

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export function Footer({ settings, legalHrefs }: { settings: SiteSettings | null; legalHrefs: string[] }) {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const brand = useTranslations("Brand");
  const locale = useLocale();
  const year = new Date().getFullYear();

  const legalName = settings?.legalName ?? siteConfig.orgLegalName;
  const tagline = pickText(settings?.tagline, locale) || brand("tagline");
  const statusLine = pickText(settings?.statusLine, locale) || brand("statusLine");
  const political = pickText(settings?.neutralityStatement, locale) || t("political");
  const socials = settings
    ? settings.socialLinks.map((s) => ({ platform: s.platform, href: s.url }))
    : staticSocialLinks.map((s) => ({ platform: s.label.toLowerCase(), href: s.href }));
  const donateEnabled = settings?.donateEnabled ?? true;
  const involvedLinks = footerInvolvedLinks.filter((link) => donateEnabled || link.key !== "donate");
  // A legal page is linked only once its first version is published (404 until then).
  const legalLinks = footerLegalLinks.filter((link) => legalHrefs.includes(link.href));

  return (
    <footer className="site-footer">
      <div className="site-footer__main">
        <div className="site-container site-footer__grid">
          <div className="footer-brand">
            <Link href="/" className="brand-logo" aria-label={legalName}>
              <Image src="/images/logo.jpg" alt="" width={56} height={56} />
              <span className="brand-logo__name">
                <strong>{brand("name")}</strong>
                <span>{brand("sub")}</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[0.74rem] leading-relaxed text-white/70">{tagline}</p>
          </div>

          <div>
            <h3 className="footer-heading">{t("quickLinks")}</h3>
            <div className="footer-links">
              {footerQuickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {nav(link.key)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="footer-heading">{t("getInvolved")}</h3>
            <div className="footer-links">
              {involvedLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {nav(link.key)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="footer-heading">{t("connect")}</h3>
            <div className="social-row">
              {socials.map((social) => {
                const Icon = SOCIAL_ICONS[social.platform] ?? Globe;
                const label = SOCIAL_LABELS[social.platform] ?? social.platform;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="social-link"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="footer-mission">
            <p className="m-0">{statusLine}</p>
            <p className="mt-2 mb-0 font-extrabold tracking-[0.18em] text-white uppercase">
              {t("together")}
            </p>
          </div>
        </div>
      </div>

      <div className="site-container site-footer__bottom">
        <p className="m-0">
          © {year} {legalName} {t("rights")}
          <span className="mx-2 opacity-50">·</span>
          {t("location")}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {nav(link.key)}
            </Link>
          ))}
        </div>
      </div>
      <p className="site-container pb-4 text-[0.64rem] text-white/45">{political}</p>
    </footer>
  );
}
