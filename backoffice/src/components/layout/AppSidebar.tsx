"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInboxCounts } from "@/hooks/use-inbox-counts";
import { useSessionUser } from "@/hooks/use-session";
import { logout, type SessionUser } from "@/lib/auth";
import { isFormType } from "@/lib/formFields";
import { canSee, navGroups } from "@/lib/nav";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  read_only: "Read-only",
};

const ICON_BUTTON =
  "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-sidebar-foreground/70 outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2";

/**
 * Collapse / expand control that lives in the sidebar itself (the header
 * hamburger and the thin rail on the edge still work). On mobile the sidebar
 * is a sheet with its own close button, so nothing is rendered there.
 */
function CollapseButton() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  if (isMobile) return null;

  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={label}
            aria-expanded={!collapsed}
            data-sidebar="collapse"
            className={ICON_BUTTON}
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "bottom"}>
        {label}
        <kbd
          data-slot="kbd"
          className="ml-1 rounded-sm bg-background/20 px-1 font-mono text-[0.65rem] font-semibold"
        >
          Ctrl+B
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const user = useSessionUser();
  const counts = useInboxCounts();

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

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
          <Link
            href="/"
            title="Dashboard"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-1 py-1 outline-hidden ring-sidebar-ring focus-visible:ring-2 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:px-0"
          >
            <Image
              src="/images/logo.jpg"
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full object-cover group-data-[collapsible=icon]:size-8"
            />
            <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-[0.95rem] font-bold text-sidebar-foreground">Be Real</span>
              <span className="text-[0.62rem] font-extrabold tracking-[0.16em] text-sidebar-foreground/70 uppercase">
                Backoffice
              </span>
            </span>
          </Link>
          <CollapseButton />
        </div>
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
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:px-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-purple-100 text-[0.7rem] font-extrabold text-brand-purple-700" />
              }
            >
              {initials}
            </TooltipTrigger>
            <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
              {user?.name ?? "—"}
              {user ? ` · ${ROLE_LABEL[user.role]}` : ""}
            </TooltipContent>
          </Tooltip>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[0.82rem] font-bold text-sidebar-foreground">
              {user?.name ?? "—"}
            </span>
            <span className="text-[0.66rem] text-sidebar-foreground/70">
              {user ? ROLE_LABEL[user.role] : ""}
            </span>
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className={`${ICON_BUTTON} ml-auto group-data-[collapsible=icon]:ml-0`}
                />
              }
            >
              <LogOut className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
              Sign out
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
