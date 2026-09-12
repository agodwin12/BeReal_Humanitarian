import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import { getModule } from "@/lib/modules";

// Catch-all for every module that hasn't been built yet. A real module gets
// its own folder (e.g. app/(dashboard)/donations/page.tsx), which Next.js
// matches ahead of this route — so screens graduate one at a time.
export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const module = getModule(`/${slug.join("/")}`);
  return { title: module ? `${module.title} — Be Real Backoffice` : "Be Real Backoffice" };
}

export default async function ModulePage({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const module = getModule(`/${slug.join("/")}`);
  if (!module) notFound();
  return <ModulePlaceholder module={module} />;
}
