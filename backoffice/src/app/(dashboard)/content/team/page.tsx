import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { TeamView } from "@/components/content/TeamView";

export const metadata: Metadata = { title: "Team — Be Real Backoffice" };

export default function TeamPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Team" description="Board members and staff shown on the About page, with per-person photo approval." />
      <TeamView />
    </>
  );
}
