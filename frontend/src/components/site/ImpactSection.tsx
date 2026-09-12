import { useTranslations } from "next-intl";
import { Heart, Sprout, Users } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { impactItems } from "@/lib/content/impact";

const ICONS = { users: Users, heart: Heart, sprout: Sprout } as const;

export function ImpactSection() {
  const t = useTranslations("Impact");

  return (
    <section className="impact-strip wave-section">
      <div className="site-container impact-strip__grid">
        <FadeIn className="impact-strip__intro">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="section-title">{t("title")}</h2>
          <p>{t("body")}</p>
        </FadeIn>

        {impactItems.map((item, index) => {
          const Icon = ICONS[item.icon];
          return (
            <FadeIn key={item.key} delay={0.08 + index * 0.07} className="impact-item">
              <div className="impact-item__icon">
                <Icon className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h3>{t(`items.${item.key}.title`)}</h3>
                <p>{t(`items.${item.key}.description`)}</p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
