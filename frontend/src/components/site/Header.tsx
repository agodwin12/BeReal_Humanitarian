"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { mainNavLinks, siteConfig, type NavKey } from "@/lib/site-config";

export type HeaderProps = {
  /** Visible entries in display order (from Site settings); defaults to the built-in nav. */
  nav?: { key: string; href: string }[];
  donateEnabled?: boolean;
  enabledLocales?: string[];
  legalName?: string;
  logoSrc?: string;
};

export function BrandLogo({ className, legalName, logoSrc }: { className?: string; legalName?: string; logoSrc?: string }) {
  const t = useTranslations("Brand");
  return (
    <Link href="/" className={cn("brand-logo", className)} aria-label={legalName ?? siteConfig.orgLegalName}>
      <Image src={logoSrc ?? "/images/logo.jpg"} alt="" width={56} height={56} priority />
      <span className="brand-logo__name">
        <strong>{t("name")}</strong>
        <span>{t("sub")}</span>
      </span>
    </Link>
  );
}

export function Header({ nav = mainNavLinks, donateEnabled = true, enabledLocales, legalName, logoSrc }: HeaderProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const label = (key: string) => t(key as NavKey);

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <BrandLogo legalName={legalName} logoSrc={logoSrc} />

        <nav className="main-nav" aria-label={t("siteNavigation")}>
          {nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-link", isActive(link.href) && "is-active")}
            >
              {label(link.key)}
            </Link>
          ))}
          {donateEnabled ? (
            <Button asChild variant="coral" size="sm" className="ml-1">
              <Link href="/donate">{t("donate")}</Link>
            </Button>
          ) : null}
        </nav>

        <div className="header-actions">
          <div className="desktop-only">
            <LanguageSwitcher locales={enabledLocales} />
          </div>

          <div className="flex items-center gap-2 min-[901px]:hidden">
            <LanguageSwitcher locales={enabledLocales} />
            <Sheet open={open} onOpenChange={setOpen}>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("openMenu")}
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <SheetContent side="right" className="w-[300px] bg-white">
                <SheetHeader>
                  <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
                  <SheetDescription className="sr-only">
                    {t("siteNavigation")}
                  </SheetDescription>
                  <BrandLogo legalName={legalName} logoSrc={logoSrc} />
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label={t("siteNavigation")}>
                  {nav.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-[10px] px-3 py-2.5 text-sm font-bold text-[#2f2844] hover:bg-brand-purple-50 hover:text-brand-purple-700",
                        isActive(link.href) && "text-brand-purple-700",
                      )}
                    >
                      {label(link.key)}
                    </Link>
                  ))}
                  {donateEnabled ? (
                    <Button asChild variant="coral" className="mt-3">
                      <Link href="/donate" onClick={() => setOpen(false)}>
                        {t("donate")}
                      </Link>
                    </Button>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
