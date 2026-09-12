"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useInboxCounts } from "@/hooks/use-inbox-counts";
import { getSessionUser, logout, type SessionUser } from "@/lib/auth";
import { isFormType } from "@/lib/formFields";
import { canSee, navGroups } from "@/lib/nav";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  read_only: "Read-only",
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const counts = useInboxCounts();

  useEffect(() => {
    setUser(getSessionUser());
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  // "New" count for /inbox/<type> items; nothing for other entries.
  const badgeFor = (href: string) => {
    const type = href.startsWith("/inbox/") ? href.slice("/inbox/".length) : "";
    if (!isFormType(type)) return 0;
    return counts?.[type]?.new ?? 0;
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 px-1 py-1">
          <Image
            src="/images/logo.jpg"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full object-cover"
          />
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[0.95rem] font-bold text-sidebar-foreground">Be Real</span>
            <span className="text-[0.62rem] font-extrabold tracking-[0.16em] text-sidebar-foreground/70 uppercase">
              Backoffice
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const items = group.items.filter((item) => canSee(item, user?.role ?? null));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive(item.href)}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {badgeFor(item.href) > 0 ? (
                        <SidebarMenuBadge className="rounded-[6px] bg-brand-coral-500 px-1.5 text-[0.66rem] font-extrabold text-white tabular-nums">
                          {badgeFor(item.href)}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-purple-100 text-[0.7rem] font-extrabold text-brand-purple-700">
            {(user?.name ?? "?")
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[0.82rem] font-bold text-sidebar-foreground">
              {user?.name ?? "—"}
            </span>
            <span className="text-[0.66rem] text-sidebar-foreground/70">
              {user ? ROLE_LABEL[user.role] : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[8px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
