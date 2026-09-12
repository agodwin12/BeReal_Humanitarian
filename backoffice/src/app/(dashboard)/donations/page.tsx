import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { DonationsView } from "@/components/donations/DonationsView";

export const metadata: Metadata = { title: "Donations — Be Real Backoffice" };

// ?id=<donation id> opens that donation's detail (links from Monthly gifts).
export default async function DonationsPage({ searchParams }: PageProps<"/donations">) {
  const { id } = await searchParams;
  const initialId = Number(id);
  return (
    <>
      <PageHeader
        eyebrow="Donations"
        title="Donations"
        description="Every gift received through Stripe, with receipts, refunds and payouts. Super Admin and Read-only."
      />
      <DonationsView initialId={Number.isInteger(initialId) && initialId > 0 ? initialId : null} />
    </>
  );
}
