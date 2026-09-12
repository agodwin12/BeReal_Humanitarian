import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationSettingsView } from "@/components/settings/NotificationSettingsView";

export const metadata: Metadata = { title: "Notifications — Be Real Backoffice" };

export default function NotificationSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Site"
        title="Notifications"
        description="Who is emailed when a form is submitted on the website, and in which language. Super Admin only."
      />
      <NotificationSettingsView />
    </>
  );
}
