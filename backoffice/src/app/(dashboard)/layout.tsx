import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-cookie";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // The sidebar writes its open/collapsed state to a cookie; reading it here
  // means a collapsed sidebar stays collapsed across reloads without a flash.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="bg-[#f7f6fa]">
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
