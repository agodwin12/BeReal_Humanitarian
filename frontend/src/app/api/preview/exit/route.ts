import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "/en";
  (await draftMode()).disable();
  redirect(path.startsWith("/") && !path.startsWith("//") ? path : "/en");
}
