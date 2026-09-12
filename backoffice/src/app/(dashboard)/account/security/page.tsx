import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SecurityView } from "@/components/account/SecurityView";

export const metadata: Metadata = { title: "Security — Be Real Backoffice" };

export default function SecurityPage() {
  return (
    <>
      <PageHeader eyebrow="My account" title="Security & password" description="Two-factor authentication with an authenticator app, recovery codes, and your password." />
      <SecurityView />
    </>
  );
}
