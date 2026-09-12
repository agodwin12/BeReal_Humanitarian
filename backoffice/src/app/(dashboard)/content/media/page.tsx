import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { MediaLibraryView } from "@/components/content/MediaLibraryView";

export const metadata: Metadata = { title: "Media library — Be Real Backoffice" };

export default function MediaPage() {
  return (
    <>
      <PageHeader eyebrow="Content" title="Media library" description="Photos, the logo and PDFs. Every image needs alt text; a file can be deleted only when nothing uses it." />
      <MediaLibraryView />
    </>
  );
}
