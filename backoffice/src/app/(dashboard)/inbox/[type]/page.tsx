import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { InboxView } from "@/components/inbox/InboxView";
import { INBOX, isFormType } from "@/lib/formFields";

type Params = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { type } = await params;
  return { title: `${isFormType(type) ? INBOX[type].title : "Inbox"} — Be Real Backoffice` };
}

export default async function InboxPage({ params }: Params) {
  const { type } = await params;
  if (!isFormType(type)) notFound();
  const inbox = INBOX[type];

  return (
    <>
      <PageHeader eyebrow="Inbox" title={inbox.title} description={inbox.description} />
      <Suspense>
        <InboxView type={type} />
      </Suspense>
    </>
  );
}
