import { useTranslations } from "next-intl";
import {
  Church,
  HandHelping,
  HeartHandshake,
  ShieldCheck,
  Sprout,
  UserCheck,
} from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils";

// Core values from the website content brief (Section 2).
const VALUES = [
  { key: "compassion", icon: HeartHandshake },
  { key: "faith", icon: Church },
  { key: "integrity", icon: ShieldCheck },
  { key: "dignity", icon: UserCheck },
  { key: "service", icon: HandHelping },
  { key: "empowerment", icon: Sprout },
] as const;

export function ValuesSection() {
  const t = useTranslations("About.values");

  return (
    <section className="section">
      <div className="site-container">
        <FadeIn className="section-intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
        </FadeIn>

        <div className="grid-3">
          {VALUES.map((value, index) => (
            <FadeIn key={value.key} delay={index * 0.06} className="value-card">
              <div
                className={cn(
                  "value-card__icon",
                  index % 2 === 1 && "value-card__icon--coral",
                )}
              >
                <value.icon className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h3>{t(`items.${value.key}.title`)}</h3>
                <p>{t(`items.${value.key}.body`)}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
