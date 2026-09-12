import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import type { PageImage } from "@/lib/cms";

export function GetInvolvedSection({ image, donateEnabled = true }: { image: PageImage; donateEnabled?: boolean }) {
  const t = useTranslations("GetInvolved");

  return (
    <section className="get-involved">
      <div className="get-involved__bg" aria-hidden="true">
        <Image
          src={image.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_55%]"
        />
      </div>

      <div className="site-container get-involved__inner">
        <FadeIn className="get-involved__copy">
          <span className="eyebrow eyebrow--light">{t("eyebrow")}</span>
          <h2 className="section-title section-title--light">{t("title")}</h2>
          <p>{t("body")}</p>
          <div className="get-involved__actions">
            {donateEnabled ? (
              <Button asChild variant="coral" size="lg">
                <Link href="/donate">
                  {t("donate")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant={donateEnabled ? "outline-light" : "coral"} size="lg">
              <Link href="/get-involved">{t("volunteer")}</Link>
            </Button>
            <Button asChild variant="outline-light" size="lg">
              <Link href="/get-involved#partner">{t("partner")}</Link>
            </Button>
          </div>
        </FadeIn>

        <div className="script-note" aria-hidden="true">
          {t("note")}
        </div>
      </div>
    </section>
  );
}
