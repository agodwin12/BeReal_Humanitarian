import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProgramsView } from "@/components/content/ProgramsView";

export const metadata: Metadata = { title: "Programs — Be Real Backoffice" };

export default function ProgramsPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Programs" description="The program cards on the homepage and the blocks on the Programs page — names, purpose, focus items and photos in EN / FR / ES." />
      <ProgramsView />
    </>
  );
}
