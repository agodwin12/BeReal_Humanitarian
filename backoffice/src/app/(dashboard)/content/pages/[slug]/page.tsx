import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageEditorView } from "@/components/content/PageEditorView";

const TITLES: Record<string, string> = {
  home: "Home",
  about: "About",
  programs: "Programs",
  impact: "Impact",
  "get-involved": "Get Involved",
  "request-assistance": "Request Assistance",
  contact: "Contact",
  global: "Global (header, footer, forms)",
};

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${TITLES[slug] ?? "Page"} — Pages — Be Real Backoffice` };
}

export default async function PageEditorPage({ params }: Params) {
  const { slug } = await params;
  return (
    <>
      <PageHeader eyebrow="Content · Pages" title={TITLES[slug] ?? slug} description="Empty fields keep the built-in text (shown greyed as a placeholder). Save a draft, preview it on the site, then publish." />
      <PageEditorView slug={slug} />
    </>
  );
}
