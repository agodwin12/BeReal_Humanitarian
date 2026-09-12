import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ImpactView } from "@/components/content/ImpactView";

export const metadata: Metadata = { title: "Impact — Be Real Backoffice" };

export default function ImpactPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Impact" description="Documented metrics, stories published only with consent, and dated stewardship updates." />
      <ImpactView />
    </>
  );
}
