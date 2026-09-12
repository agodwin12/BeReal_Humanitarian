import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Staff preview: the backoffice "Preview" button opens
// /api/preview?token=<PREVIEW_SECRET>&path=/en/about. Draft Mode then makes
// every page read unpublished content until /api/preview/exit is visited.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const path = url.searchParams.get("path") || "/en";
  const secret = process.env.PREVIEW_SECRET;

  if (!secret || token !== secret) {
    return new Response("Invalid preview token", { status: 401 });
  }

  (await draftMode()).enable();
  redirect(path.startsWith("/") && !path.startsWith("//") ? path : "/en");
}
