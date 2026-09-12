import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";

import type { ProgramView } from "@/lib/programs-view";

// Anchor chips to each program section (the home cards link to these ids).
export function ProgramsQuickNav({ programs }: { programs: ProgramView[] }) {
  const t = useTranslations("ProgramsPage");

  return (
    <nav className="quick-nav" aria-label={t("quickNavLabel")}>
      {programs.map((program) => (
        <a key={program.slug} href={`#${program.slug}`}>
          {program.name}
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
