"use client";

import { useLocale, useTranslations } from "next-intl";

import { FlagES, FlagFR, FlagUS } from "@/components/icons/flags";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const FLAGS = { en: FlagUS, fr: FlagFR, es: FlagES } as const;

// Switches locale while staying on the same page (/en/about → /fr/about).
// `locales` (from Site settings) can hide FR / ES until their review is done;
// English is always offered.
export function LanguageSwitcher({ locales }: { locales?: string[] }) {
  const t = useTranslations("Languages");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const enabled = routing.locales.filter((code) => code === "en" || !locales || locales.includes(code));
  if (enabled.length < 2) return null;

  const switchTo = (next: AppLocale) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t("label")}>
      {enabled.map((code) => {
        const Flag = FLAGS[code];
        const isActive = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-pressed={isActive}
            aria-label={t(code)}
            title={t(code)}
            lang={code}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-[8px] transition-[background-color,box-shadow,opacity] duration-[180ms]",
              isActive
                ? "bg-brand-purple-50 shadow-[inset_0_0_0_1.5px_var(--brand-purple-500)]"
                : "opacity-60 hover:bg-brand-purple-50 hover:opacity-100",
            )}
          >
            <Flag className="h-[14px] w-[21px] rounded-[3px] shadow-[0_0_0_1px_rgb(33_16_68/0.12)]" />
            <span className="sr-only">{code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
