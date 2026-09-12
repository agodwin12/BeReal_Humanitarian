import type { Metadata } from "next";

import { AuditView } from "@/components/audit/AuditView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Audit log — Be Real Backoffice" };

export default function AuditLogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Every sign-in and every change, with who did it, when, and what changed. Super Admin only."
      />
      <AuditView />
    </>
  );
}
