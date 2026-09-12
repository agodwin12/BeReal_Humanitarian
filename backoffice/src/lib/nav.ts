import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  FileText,
  HandHelping,
  Handshake,
  HeartHandshake,
  Images,
  Inbox,
  KeyRound,
  Languages,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  Mail,
  Newspaper,
  Scale,
  Settings,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

export type Role = "super_admin" | "editor" | "read_only";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Omit = visible to every role. */
  roles?: Role[];
};

export type NavGroup = { label: string; items: NavItem[] };

// Sidebar structure mirrors doc/backoffice-scope.md §4. Role gating follows
// spec §06: donations, donation settings and the Request Assistance inbox are
// Super Admin only; Read-only sees dashboards and lists but cannot change anything.
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Donations",
    items: [
      { title: "Donations", href: "/donations", icon: HeartHandshake, roles: ["super_admin", "read_only"] },
      { title: "Donation settings", href: "/donations/settings", icon: Settings2, roles: ["super_admin"] },
    ],
  },
  {
    label: "Inbox",
    items: [
      { title: "Volunteer interest", href: "/inbox/volunteer", icon: HandHelping },
      { title: "Partnership inquiries", href: "/inbox/partnership", icon: Handshake },
      { title: "Request assistance", href: "/inbox/assistance", icon: LifeBuoy, roles: ["super_admin"] },
      { title: "General contact", href: "/inbox/contact", icon: Mail },
      { title: "Newsletter subscribers", href: "/inbox/newsletter", icon: Newspaper },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Pages", href: "/content/pages", icon: FileText },
      { title: "Programs", href: "/content/programs", icon: Layers },
      { title: "Impact", href: "/content/impact", icon: TrendingUp },
      { title: "Team", href: "/content/team", icon: UserRound },
      { title: "Media library", href: "/content/media", icon: Images },
      { title: "Legal pages", href: "/content/legal", icon: Scale },
    ],
  },
  {
    label: "Site",
    items: [
      { title: "Site settings", href: "/settings/site", icon: Settings, roles: ["super_admin"] },
      { title: "Notifications", href: "/settings/notifications", icon: BellRing, roles: ["super_admin"] },
      { title: "Translations", href: "/translations", icon: Languages },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users & roles", href: "/users", icon: Users, roles: ["super_admin"] },
      { title: "System", href: "/system", icon: Activity, roles: ["super_admin"] },
      { title: "Audit log", href: "/system/audit", icon: ShieldCheck, roles: ["super_admin"] },
    ],
  },
  {
    label: "My account",
    items: [{ title: "Security & password", href: "/account/security", icon: KeyRound }],
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);

export function canSee(item: NavItem, role: Role | null) {
  if (!item.roles) return true;
  return role ? item.roles.includes(role) : false;
}
