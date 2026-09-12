import Image from "next/image";
import { useTranslations } from "next-intl";
import { BadgeCheck, ShieldCheck, Users } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import type { PageImage } from "@/lib/cms";
import { cn } from "@/lib/utils";

const PRINCIPLES = [
  { key: "consent", icon: Users },
  { key: "stewardship", icon: ShieldCheck },
  { key: "truth", icon: BadgeCheck },
] as const;

export function ImpactPrinciplesSection({ image }: { image: PageImage }) {
  const t = useTranslations("ImpactPage.principles");

  return (
    <section className="section section--lavender wave-section wave-top wave-bottom">
      <div className="site-container split">
        <FadeIn>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <div className="mt-6 grid gap-3">
            {PRINCIPLES.map((principle, index) => (
              <div key={principle.key} className="value-card">
                <div
                  className={cn(
                    "value-card__icon",
                    index % 2 === 1 && "value-card__icon--coral",
                  )}
                >
                  <principle.icon className="size-6" strokeWidth={1.8} />
                </div>
                <div>
                  <h3>{t(`${principle.key}.title`)}</h3>
                  <p>{t(`${principle.key}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="split__image split__image--tall image-container">
          <Image
            src={image.src}
            alt={image.alt ?? t("imageAlt")}
            fill
            sizes="(max-width: 900px) 100vw, 45vw"
            className="object-cover"
          />
        </FadeIn>
      </div>
    </section>
  );
}
