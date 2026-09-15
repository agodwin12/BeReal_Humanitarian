import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AssistantView } from "@/components/settings/AssistantView";

export const metadata: Metadata = { title: "AI assistant — Be Real Backoffice" };

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="Site"
        title="AI assistant"
        description="The chat bubble on the website. It answers from the published content only (programs, donations, how to get involved, contact) and never invents facts. Switch it on or off, set its name and welcome message, add extra knowledge, test it, and read what visitors ask. Super Admin only."
      />
      <AssistantView />
    </>
  );
}
