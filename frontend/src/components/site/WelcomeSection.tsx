import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { PageImage } from "@/lib/cms";

export function WelcomeSection({ image }: { image: PageImage }) {
  const t = useTranslations("Welcome");

  return (
    <section className="welcome wave-section wave-top wave-bottom">
      <div className="site-container welcome__grid">
        <FadeIn className="welcome__copy">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead">{t("body")}</p>
          <Button asChild variant="purple" size="lg">
            <Link href="/about">
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </FadeIn>

        <FadeIn delay={0.08} className="welcome__image image-container">
          <Image
            src={image.src}
            alt={image.alt ?? t("imageAlt")}
            fill
            sizes="(max-width: 900px) 100vw, 30vw"
            className="object-cover"
          />
        </FadeIn>

        <FadeIn delay={0.16} className="quote-card">
          <span className="quote-mark" aria-hidden="true">
            &ldquo;
          </span>
          <div>
            <p>{t("quote")}</p>
            <div className="quote-card__dash" aria-hidden="true" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
