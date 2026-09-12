import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { DonationsView } from "@/components/donations/DonationsView";

export const metadata: Metadata = { title: "Donations — Be Real Backoffice" };

export default function DonationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Donations"
        title="Donations"
        description="Every gift received through Stripe, with receipts, refunds and payouts. Super Admin and Read-only."
      />
      <DonationsView />
    </>
  );
}
