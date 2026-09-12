import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { ProgramCard } from "@/components/site/ProgramCard";
import { Link } from "@/i18n/navigation";
import type { ProgramView } from "@/lib/programs-view";

export function ProgramsSection({ programs }: { programs: ProgramView[] }) {
  const t = useTranslations("Programs");

  return (
    <section className="programs">
      <div className="site-container">
        <FadeIn className="programs__heading">
          <div>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2 className="section-title">{t("title")}</h2>
          </div>
          <p className="programs__intro">{t("intro")}</p>
          <Link href="/programs" className="programs__link">
            {t("viewAll")}
            <ArrowRight className="size-4" />
          </Link>
        </FadeIn>

        <div className="programs-grid">
          {programs.map((program, index) => (
            <FadeIn key={program.slug} delay={index * 0.07}>
              <ProgramCard
                program={program}
                tint={index % 2 === 0 ? "lavender" : "coral"}
              />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
