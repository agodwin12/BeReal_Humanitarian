import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { DonationSettingsView } from "@/components/donations/DonationSettingsView";

export const metadata: Metadata = { title: "Donation settings — Be Real Backoffice" };

export default function DonationSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Donations"
        title="Donation settings"
        description="Suggested amounts, the thank-you page, receipt wording per language, the Stripe connection and the kill switch. Super Admin only."
      />
      <DonationSettingsView />
    </>
  );
}
