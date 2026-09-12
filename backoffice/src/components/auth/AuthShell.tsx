import Image from "next/image";
import type { ReactNode } from "react";

import { EnvBadge } from "@/components/layout/EnvBadge";

// Shared frame for sign-in, forgot / reset password and invitation screens.
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8f6ff_0%,#efe9fb_100%)] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.jpg" alt="" width={48} height={48} className="size-12 rounded-full object-cover" priority />
            <div className="leading-tight">
              <div className="text-lg font-bold text-brand-purple-950">Be Real</div>
              <div className="text-[0.66rem] font-extrabold tracking-[0.18em] text-brand-purple-700 uppercase">
                Humanitarian Works · Backoffice
              </div>
            </div>
          </div>
          <EnvBadge />
        </div>

        <div className="rounded-[19px] border border-border bg-white/80 p-7 shadow-[0_10px_35px_rgb(38_18_76/0.07)]">
          <h1 className="font-display text-[2rem] leading-none text-brand-purple-950">{title}</h1>
          {description ? <p className="mt-2 mb-6 text-sm text-muted-foreground">{description}</p> : <div className="mb-6" />}
          {children}
        </div>

        {footer ? <div className="mt-4 text-center text-sm">{footer}</div> : null}

        <p className="mt-5 text-center text-[0.72rem] text-muted-foreground">
          Be Real Humanitarian Works Inc. · Texas nonprofit corporation · 501(c)(3)
        </p>
      </div>
    </main>
  );
}
