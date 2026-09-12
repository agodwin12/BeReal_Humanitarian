import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyGiftsView } from "@/components/donations/MonthlyGiftsView";

export const metadata: Metadata = { title: "Monthly gifts — Be Real Backoffice" };

// ?id=<monthly gift id> opens that gift's detail (links from the ledger).
export default async function MonthlyGiftsPage({ searchParams }: PageProps<"/donations/monthly">) {
  const { id } = await searchParams;
  const initialId = Number(id);
  return (
    <>
      <PageHeader
        eyebrow="Donations"
        title="Monthly gifts"
        description="Recurring donors: who gives every month, what has been received, next charge, cancellations. Each monthly payment also appears in the Donations ledger with its own receipt."
      />
      <MonthlyGiftsView initialId={Number.isInteger(initialId) && initialId > 0 ? initialId : null} />
    </>
  );
}
