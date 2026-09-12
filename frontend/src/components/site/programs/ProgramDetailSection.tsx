import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { programIcon } from "@/components/site/program-icons";
import type { ProgramView } from "@/lib/programs-view";
import { cn } from "@/lib/utils";

export function ProgramDetailSection({
  program,
  index,
}: {
  program: ProgramView;
  index: number;
}) {
  const t = useTranslations("ProgramsPage");
  const Icon = programIcon(program.icon);
  const imageSide = index % 2 === 0 ? "left" : "right";

  return (
    <section
      id={program.slug}
      className={cn(
        "program-detail",
        index % 2 === 1 && "section--lavender wave-section wave-top wave-bottom",
        program.tint === "coral" && "program-detail--coral",
      )}
    >
      <div
        className={cn(
          "site-container split",
          imageSide === "right" && "split--reverse",
        )}
      >
        <FadeIn className="split__image split__image--tall image-container">
          <Image
            src={program.detail.src}
            alt={program.detail.alt ?? program.name}
            fill
            sizes="(max-width: 900px) 100vw, 45vw"
            className="object-cover"
          />
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "program-card__icon",
                program.tint === "coral" && "program-card__icon--coral",
              )}
            >
              <Icon className="size-7" strokeWidth={1.8} />
            </div>
            <span className="eyebrow mb-0">{t("programLabel")}</span>
          </div>

          <h2 className="section-title mt-4">{program.name}</h2>

          {program.purpose ? (
            <>
              <span className="program-detail__label">{t("purposeLabel")}</span>
              <p className="lead">{program.purpose}</p>
            </>
          ) : null}

          {program.focusItems.length > 0 ? (
            <>
              <span className="program-detail__label">{t("includesLabel")}</span>
              <ul className="check-list">
                {program.focusItems.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">
                      <Check strokeWidth={2.4} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </FadeIn>
      </div>
    </section>
  );
}
