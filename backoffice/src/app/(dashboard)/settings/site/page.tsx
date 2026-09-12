import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { SiteSettingsView } from "@/components/settings/SiteSettingsView";

export const metadata: Metadata = { title: "Site settings — Be Real Backoffice" };

export default function SiteSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Site" title="Site settings" description="Identity, contact details, compliance wording, navigation, languages and search defaults. Super Admin edits; everyone else can read." />
      <SiteSettingsView />
    </>
  );
}
