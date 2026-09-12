import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { UsersView } from "@/components/users/UsersView";

export const metadata: Metadata = { title: "Users & roles — Be Real Backoffice" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        description="Who can sign in to the backoffice and what they can do. Super Admin only."
      />
      <UsersView />
    </>
  );
}
