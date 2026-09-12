import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { TranslationsView } from "@/components/translations/TranslationsView";

export const metadata: Metadata = { title: "Translations — Be Real Backoffice" };

export default function TranslationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Site"
        title="Translations"
        description="Every text on the website with its French and Spanish status: missing, needs review, or reviewed by a native speaker. Export a worksheet for a translator and import it back."
      />
      <TranslationsView />
    </>
  );
}
