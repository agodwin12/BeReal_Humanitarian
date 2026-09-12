import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { LegalPagesView } from "@/components/content/LegalPagesView";

export const metadata: Metadata = { title: "Legal pages — Be Real Backoffice" };

export default function LegalPagesPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Legal pages" description="Privacy Policy and Terms / Website Disclaimer, per language, with an effective date, version number and history." />
      <LegalPagesView />
    </>
  );
}
