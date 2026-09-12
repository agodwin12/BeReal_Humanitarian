import Image from "next/image";

import { Card } from "@/components/ui/card";
import { programIcon } from "@/components/site/program-icons";
import { Link } from "@/i18n/navigation";
import type { ProgramView } from "@/lib/programs-view";
import { cn } from "@/lib/utils";

export function ProgramCard({
  program,
  tint,
}: {
  program: ProgramView;
  tint: "lavender" | "coral";
}) {
  const Icon = programIcon(program.icon);

  return (
    <Card className="program-card gap-0 rounded-[14px] py-0 ring-0">
      <Link href={`/programs#${program.slug}`} className="program-card__body block">
        <div className="program-card__heading">
          <div
            className={cn(
              "program-card__icon",
              tint === "coral" && "program-card__icon--coral",
            )}
          >
            <Icon className="size-7" strokeWidth={1.8} />
          </div>
          <h3 className="program-card__title">
            {program.line1 ? (
              <>
                {program.line1}
                <br />
              </>
            ) : null}
            {program.line2}
          </h3>
        </div>
        <p className="program-card__text">{program.summary}</p>
      </Link>

      <div className="program-card__media image-container">
        <Image
          src={program.card.src}
          alt={program.card.alt ?? program.name}
          fill
          sizes="(max-width: 620px) 100vw, (max-width: 1180px) 50vw, 25vw"
          className="object-cover"
        />
      </div>
    </Card>
  );
}
