import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SubscribersView } from "@/components/inbox/SubscribersView";

export const metadata: Metadata = { title: "Newsletter subscribers — Be Real Backoffice" };

export default function NewsletterSubscribersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Newsletter subscribers"
        description="Email sign-ups with their consent record. Every email we send carries a one-click unsubscribe link."
      />
      <SubscribersView />
    </>
  );
}
