import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";

// The site's built-in copy, one language at a time. The backoffice Pages editor
// reads this to show the current default next to each override. Public content,
// so any origin may read it.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return NextResponse.json({ error: "Unknown locale" }, { status: 404, headers: CORS });
  }
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return NextResponse.json({ locale, messages }, { headers: { ...CORS, "Cache-Control": "public, max-age=60" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
