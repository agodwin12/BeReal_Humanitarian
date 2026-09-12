import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { PagesListView } from "@/components/content/PagesListView";

export const metadata: Metadata = { title: "Pages — Be Real Backoffice" };

export default function PagesPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Pages" description="Every text and photo on the website, page by page, in EN / FR / ES — with drafts, preview, publish and version history." />
      <PagesListView />
    </>
  );
}
