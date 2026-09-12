import { draftMode } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";

// Shown only to staff who opened the site through the backoffice "Preview"
// button (Next Draft Mode). Visitors never see it.
export async function PreviewBanner({ locale }: { locale: string }) {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;
  const t = await getTranslations({ locale, namespace: "Preview" });

  return (
    <div className="preview-banner" role="status">
      <Eye className="size-4" aria-hidden="true" />
      <span>{t("notice")}</span>
      <a href={`/api/preview/exit?path=/${locale}`}>{t("exit")}</a>
    </div>
  );
}
