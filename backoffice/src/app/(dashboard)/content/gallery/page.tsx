import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { GalleryView } from "@/components/content/GalleryView";

export const metadata: Metadata = { title: "Gallery — Be Real Backoffice" };

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Gallery"
        description="Photos and videos of the organization's work, shown on the website's Gallery page (“Our Work in Action”) with a title, a description and the day it happened. Newest event first."
      />
      <GalleryView />
    </>
  );
}
