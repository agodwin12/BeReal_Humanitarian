"use client";

import { LOCALES, LOCALE_NAME, LOCALE_SHORT, localizedStatus } from "@/lib/content";
import type { Locale, Localized } from "@/lib/types";
import { cn } from "@/lib/utils";

// EN / FR / ES switch for a form of localized fields. The dots show which
// languages already have text across `values` (the form's localized fields).
export function LocaleTabs({
  value,
  onChange,
  values = [],
  className,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  values?: (Localized | null | undefined)[];
  className?: string;
}) {
  const complete = (locale: Locale) => values.length > 0 && values.every((v) => localizedStatus(v)[locale]);
  const partial = (locale: Locale) => values.some((v) => localizedStatus(v)[locale]);

  return (
    <div className={cn("inline-flex rounded-[10px] bg-muted p-[3px]", className)} role="tablist" aria-label="Language">
      {LOCALES.map((locale) => {
        const active = value === locale;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(locale)}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[0.78rem] font-bold transition-colors",
              active ? "bg-white text-brand-purple-950 shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            title={LOCALE_NAME[locale]}
          >
            {LOCALE_SHORT[locale]}
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                complete(locale) ? "bg-emerald-500" : partial(locale) ? "bg-amber-400" : "bg-border",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function LocaleDots({ value }: { value: Localized | null | undefined }) {
  const status = localizedStatus(value);
  return (
    <span className="inline-flex items-center gap-1" aria-label={LOCALES.map((l) => `${LOCALE_SHORT[l]} ${status[l] ? "done" : "missing"}`).join(", ")}>
      {LOCALES.map((locale) => (
        <span
          key={locale}
          className={cn("rounded-[4px] px-1 text-[0.6rem] font-extrabold leading-4", status[locale] ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}
        >
          {LOCALE_SHORT[locale]}
        </span>
      ))}
    </span>
  );
}
