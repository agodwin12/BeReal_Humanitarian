import Image from "next/image";
import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/FadeIn";
import type { PageImage } from "@/lib/cms";

export function FaithSection({ image }: { image: PageImage }) {
  const t = useTranslations("About.faith");

  return (
    <section className="section section--lavender wave-section wave-top wave-bottom">
      <div className="site-container split">
        <FadeIn className="split__image image-container">
          <Image
            src={image.src}
            alt={image.alt ?? t("imageAlt")}
            fill
            sizes="(max-width: 900px) 100vw, 45vw"
            className="object-cover"
          />
        </FadeIn>
        <FadeIn delay={0.08}>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p className="lead mt-3">{t("body")}</p>
        </FadeIn>
      </div>
    </section>
  );
}
