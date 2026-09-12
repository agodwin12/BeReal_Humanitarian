import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Inbox, Languages, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ContentHealth } from "@/components/dashboard/ContentHealth";
import { DonationStats } from "@/components/dashboard/DonationStats";
import { InboxSummary } from "@/components/inbox/InboxSummary";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Dashboard — Be Real Backoffice" };

const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL);
const stripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE === "live" ? "Live" : "Test";

function Panel({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof Inbox;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
          <Icon className="size-4 text-brand-purple-600" />
          {title}
        </h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-brand-purple-700 hover:underline">
            Open
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Donations, incoming requests, content health, and system status at a glance."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={HeartHandshake} title="Donations" href="/donations">
          <DonationStats />
        </Panel>

        <Panel icon={Inbox} title="Inbox">
          <InboxSummary />
        </Panel>

        <Panel icon={Languages} title="Content health" href="/translations">
          <ContentHealth />
        </Panel>

        <Panel icon={ShieldCheck} title="System" href="/system">
          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
              <dt className="font-semibold text-foreground">API</dt>
              <dd className="font-bold text-muted-foreground">{apiConfigured ? "Configured" : "Not configured — demo mode"}</dd>
            </div>
            <div className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
              <dt className="font-semibold text-foreground">Stripe</dt>
              <dd className="font-bold text-muted-foreground">{stripeMode} mode · see Donation settings</dd>
            </div>
            <div className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
              <dt className="font-semibold text-foreground">Current phase</dt>
              <dd className="font-bold text-muted-foreground">E — Donations (all phases delivered)</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
