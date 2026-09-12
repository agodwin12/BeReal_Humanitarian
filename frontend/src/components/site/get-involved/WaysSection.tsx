import { useTranslations } from "next-intl";
import { ArrowRight, Gift, HandHelping, Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Volunteer / Partner / Give — copy from the brief's Get Involved page (§9).
// When donations are switched off in Site settings the Give card keeps its
// text but shows the friendly message instead of a button.
export function WaysSection({ donateEnabled = true, donateMessage }: { donateEnabled?: boolean; donateMessage?: string }) {
  const t = useTranslations("GetInvolvedPage.ways");

  return (
    <section className="section">
      <div className="site-container grid-3">
        <FadeIn className="way-card">
          <div className="value-card__icon">
            <HandHelping className="size-6" strokeWidth={1.8} />
          </div>
          <h3>{t("volunteer.title")}</h3>
          <p>{t("volunteer.body")}</p>
          <Button asChild variant="outline-purple">
            <a href="#volunteer">
              {t("volunteer.cta")}
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </FadeIn>

        <FadeIn delay={0.07} className="way-card">
          <div className={cn("value-card__icon", "value-card__icon--coral")}>
            <Handshake className="size-6" strokeWidth={1.8} />
          </div>
          <h3>{t("partner.title")}</h3>
          <p>{t("partner.body")}</p>
          <Button asChild variant="outline-purple">
            <a href="#partner">
              {t("partner.cta")}
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </FadeIn>

        <FadeIn delay={0.14} className="way-card">
          <div className="value-card__icon">
            <Gift className="size-6" strokeWidth={1.8} />
          </div>
          <h3>{t("give.title")}</h3>
          <p>{t("give.body")}</p>
          {donateEnabled ? (
            <Button asChild variant="coral">
              <Link href="/donate">
                {t("give.cta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : donateMessage ? (
            <p className="note-muted mt-2">{donateMessage}</p>
          ) : null}
        </FadeIn>
      </div>
    </section>
  );
}
