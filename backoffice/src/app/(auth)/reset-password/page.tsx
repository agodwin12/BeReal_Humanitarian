import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = { title: "Reset password — Be Real Backoffice" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="New password" description="Choose a new password for your backoffice account.">
      <Suspense fallback={null}>
        <SetPasswordForm mode="reset" />
      </Suspense>
    </AuthShell>
  );
}
