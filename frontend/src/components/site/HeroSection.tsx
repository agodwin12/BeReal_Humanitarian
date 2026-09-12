import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { PageImage } from "@/lib/cms";

export function HeroSection({ image, donateEnabled = true }: { image: PageImage; donateEnabled?: boolean }) {
  const t = useTranslations("Hero");

  return (
    <section className="hero">
      <div className="hero__photo image-container" aria-hidden={image.alt ? undefined : true}>
        <Image
          src={image.src}
          alt={image.alt ?? ""}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 60vw"
          className="object-cover object-[center_42%]"
        />
      </div>

      <div className="site-container hero__inner">
        <FadeIn className="hero__content">
          <span className="eyebrow">{t("eyebrow")}</span>

          <h1 className="display-title">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            <span className="accent">{t("line3")}</span>
            <br />
            <span className="accent">{t("line4")}</span>
          </h1>

          <p className="lead">{t("lead")}</p>

          <div className="hero__actions">
            {donateEnabled ? (
              <Button asChild variant="coral" size="lg">
                <Link href="/donate">
                  {t("donate")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant={donateEnabled ? "outline-purple" : "coral"} size="lg">
              <Link href="/get-involved">{t("getInvolved")}</Link>
            </Button>
            <Button asChild variant="outline-purple" size="lg">
              <Link href="/request-assistance">{t("requestAssistance")}</Link>
            </Button>
          </div>
        </FadeIn>

        <div className="hero__handwriting" aria-hidden="true">
          <div className="script-note">{t("note")}</div>
        </div>
      </div>
    </section>
  );
}
