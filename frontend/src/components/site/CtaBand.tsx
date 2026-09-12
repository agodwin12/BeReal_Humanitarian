import { getLocale } from "next-intl/server";

import { GetInvolvedSection } from "@/components/site/GetInvolvedSection";
import { getPageContent, getSiteSettings, pageImage } from "@/lib/cms";

// The shared "Be part of something real" band. Its copy and photo are edited
// once, under Global in the Pages editor; each page only decides whether and
// where it appears.
export async function CtaBand() {
  const locale = await getLocale();
  const [global, settings] = await Promise.all([getPageContent("global"), getSiteSettings()]);
  return (
    <GetInvolvedSection
      image={pageImage(global, "cta", "/images/cta-community.png", locale)}
      donateEnabled={settings?.donateEnabled ?? true}
    />
  );
}
