import { useLocale, useTranslations } from "next-intl";
import { Building2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { FacebookIcon } from "@/components/icons/social";
import { pickText, type SiteSettings } from "@/lib/cms";
import { siteConfig, socialLinks } from "@/lib/site-config";

// Only confirmed facts are shown (brief §12): legal name, registered office
// (as a mailing address — never presented as a walk-in office), Facebook.
// Email / phone rows appear once Site settings hold a value.
export function ContactDetails({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("ContactPage.details");
  const locale = useLocale();

  const legalName = settings?.legalName ?? siteConfig.orgLegalName;
  const address = settings ? settings.addressLine : siteConfig.publicLocation;
  const addressNote = pickText(settings?.addressNote, locale) || t("mailingNote");
  const email = settings ? settings.contactEmail : siteConfig.contactEmail;
  const phone = settings ? settings.contactPhone : siteConfig.contactPhone;
  const facebookHref = settings
    ? settings.socialLinks.find((s) => s.platform === "facebook")?.url
    : socialLinks.find((s) => s.label === "Facebook")?.href;

  return (
    <div className="contact-card">
      <span className="eyebrow">{t("eyebrow")}</span>
      <h2 className="section-title">{t("title")}</h2>

      <div className="contact-row">
        <div className="contact-row__icon">
          <Building2 className="size-5" strokeWidth={1.8} />
        </div>
        <div>
          <h3>{t("organization")}</h3>
          <p>{legalName}</p>
        </div>
      </div>

      {address ? (
        <div className="contact-row">
          <div className="contact-row__icon">
            <MapPin className="size-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3>{t("mailing")}</h3>
            <p>{address}</p>
            <small>{addressNote}</small>
          </div>
        </div>
      ) : null}

      {email ? (
        <div className="contact-row">
          <div className="contact-row__icon">
            <Mail className="size-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3>{t("email")}</h3>
            <p>
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          </div>
        </div>
      ) : null}

      {phone ? (
        <div className="contact-row">
          <div className="contact-row__icon">
            <Phone className="size-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3>{t("phone")}</h3>
            <p>
              <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
            </p>
          </div>
        </div>
      ) : null}

      {facebookHref ? (
        <div className="contact-row">
          <div className="contact-row__icon">
            <FacebookIcon className="size-5" />
          </div>
          <div>
            <h3>{t("social")}</h3>
            <p>
              <a href={facebookHref} target="_blank" rel="noopener noreferrer">
                {t("facebook")}
              </a>
            </p>
          </div>
        </div>
      ) : null}

      <div className="contact-row">
        <div className="contact-row__icon">
          <MessageCircle className="size-5" strokeWidth={1.8} />
        </div>
        <div>
          <h3>{t("response")}</h3>
          <p>{t("responseNote")}</p>
        </div>
      </div>
    </div>
  );
}
