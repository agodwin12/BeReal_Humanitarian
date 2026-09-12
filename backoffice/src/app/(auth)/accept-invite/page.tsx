import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = { title: "Accept invitation — Be Real Backoffice" };

export default function AcceptInvitePage() {
  return (
    <AuthShell
      title="Welcome aboard"
      description="Set a password to activate your Be Real backoffice account."
    >
      <Suspense fallback={null}>
        <SetPasswordForm mode="invite" />
      </Suspense>
    </AuthShell>
  );
}
