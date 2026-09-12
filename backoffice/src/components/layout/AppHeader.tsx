"use client";

import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { allNavItems } from "@/lib/nav";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function AppHeader() {
  const pathname = usePathname();
  const current =
    allNavItems.find((item) => item.href === pathname) ??
    allNavItems.find((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`));

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-bold text-foreground">{current?.title ?? "Backoffice"}</span>
      <div className="ml-auto flex items-center gap-3">
        <EnvBadge />
        <a
          href={PUBLIC_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-white px-2.5 py-1 text-[0.78rem] font-bold text-brand-purple-800 hover:bg-brand-purple-50"
        >
          View site
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </header>
  );
}
