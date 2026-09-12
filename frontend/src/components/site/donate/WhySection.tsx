import { useTranslations } from "next-intl";
import { GraduationCap, HandHeart, HeartPulse } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "relief", icon: HandHeart },
  { key: "health", icon: HeartPulse },
  { key: "empowerment", icon: GraduationCap },
] as const;

export function WhySection() {
  const t = useTranslations("DonatePage.why");
  return (
    <section className="section section--lavender wave-section wave-top wave-bottom">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
        </FadeIn>
        <div className="grid-3">
          {ITEMS.map((item, index) => (
            <FadeIn key={item.key} delay={index * 0.07} className="way-card">
              <div className={cn("value-card__icon", index % 2 === 1 && "value-card__icon--coral")}>
                <item.icon className="size-6" strokeWidth={1.8} />
              </div>
              <h3>{t(`items.${item.key}.title`)}</h3>
              <p>{t(`items.${item.key}.body`)}</p>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.2}>
          <p className="note-muted mt-6">
            {t("stewardship")}{" "}
            <Link href="/impact#stewardship" className="font-bold text-brand-purple-700 hover:underline">
              →
            </Link>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
