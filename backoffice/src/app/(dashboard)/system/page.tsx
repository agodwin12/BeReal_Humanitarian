import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SystemView } from "@/components/system/SystemView";

export const metadata: Metadata = { title: "System — Be Real Backoffice" };

export default function SystemPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="System"
        description="Health of the pieces behind the site: database, storage, email delivery, protection, Stripe and backups. Super Admin only."
      />
      <SystemView />
    </>
  );
}
