"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, isDemoMode } from "@/lib/api";
import type { PageSummary, TeamMember, TranslationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; value: number | null };

// Dashboard "content health": live counts from translations, team and pages.
export function ContentHealth() {
  const [items, setItems] = useState<Item[]>([
    { label: "Fields awaiting French review", href: "/translations", value: null },
    { label: "Fields awaiting Spanish review", href: "/translations", value: null },
    { label: "Team members without a photo", href: "/content/team", value: null },
    { label: "Pages with unpublished changes", href: "/content/pages", value: null },
  ]);

  useEffect(() => {
    if (isDemoMode) return;
    Promise.allSettled([
      api.get<{ summary: TranslationSummary }>("/api/translations/summary"),
      api.get<TeamMember[]>("/api/team-members"),
      api.get<PageSummary[]>("/api/pages"),
    ]).then(([translations, team, pages]) => {
      const summary = translations.status === "fulfilled" ? translations.value.data.summary : null;
      const pending = (locale: "fr" | "es") => (summary ? summary.locales[locale].missing + summary.locales[locale].needs_review : null);
      setItems([
        { label: "Fields awaiting French review", href: "/translations", value: pending("fr") },
        { label: "Fields awaiting Spanish review", href: "/translations", value: pending("es") },
        { label: "Team members without a photo", href: "/content/team", value: team.status === "fulfilled" ? team.value.data.filter((m) => !m.photoMediaId).length : null },
        { label: "Pages with unpublished changes", href: "/content/pages", value: pages.status === "fulfilled" ? pages.value.data.filter((p) => p.hasUnpublishedChanges).length : null },
      ]);
    });
  }, []);

  return (
    <ul className="grid gap-1.5">
      {items.map((item) => (
        <li key={item.label}>
          <Link href={item.href} className="flex items-center justify-between rounded-[10px] px-3 py-2 text-sm font-semibold text-foreground hover:bg-brand-purple-50">
            {item.label}
            <span className={cn("rounded-[6px] px-2 py-0.5 text-[0.7rem] font-bold tabular-nums", item.value ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground")}>
              {item.value === null ? "—" : item.value}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
