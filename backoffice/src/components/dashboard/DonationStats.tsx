"use client";

import { useEffect, useState } from "react";

import { useSessionUser } from "@/hooks/use-session";
import { api, isDemoMode } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { DonationSummary } from "@/lib/types";

// Dashboard donation widgets (E4): today / month / year / all-time from the
// ledger, payouts from Stripe once keys exist. Editors have no access to
// donations (spec §06) and see a short note instead.
export function DonationStats() {
  const me = useSessionUser();
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (isDemoMode || !me) return;
    if (me.role === "editor") {
      setForbidden(true);
      return;
    }
    api
      .get<DonationSummary>("/api/donations/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => setForbidden(true));
  }, [me]);

  if (forbidden) return <p className="text-[0.8rem] text-muted-foreground">Donation figures are visible to Super Admins and Read-only accounts.</p>;

  const items = [
    { label: "Today", totals: summary?.periods.today },
    { label: "This month", totals: summary?.periods.month },
    { label: "This year", totals: summary?.periods.year },
    { label: "All time", totals: summary?.periods.allTime },
  ];

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[10px] bg-brand-purple-50 px-3.5 py-3">
            <div className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</div>
            <div className="mt-1 text-2xl font-bold text-brand-purple-950 tabular-nums">{item.totals ? formatMoney(item.totals.grossCents, summary?.currency) : "—"}</div>
            <div className="mt-0.5 text-[0.68rem] text-muted-foreground">{item.totals ? `${item.totals.count} gift${item.totals.count === 1 ? "" : "s"} · net ${formatMoney(item.totals.netCents, summary?.currency)}` : "Loading…"}</div>
          </div>
        ))}
      </div>
      {summary ? (
        <p className="text-[0.72rem] text-muted-foreground">
          {summary.mode === "live" ? "Live Stripe account." : summary.mode === "test" ? "Stripe test mode — test cards only." : "Simulated mode — no Stripe keys yet; figures come from simulated checkouts."}
          {summary.payouts && !("error" in summary.payouts) ? ` Payouts: ${formatMoney(summary.payouts.availableCents, summary.currency)} available, ${formatMoney(summary.payouts.pendingCents, summary.currency)} in transit.` : " Payouts appear once the account keys are set."}
          {summary.recurring ? ` Monthly gifts: ${summary.recurring.active} active (${formatMoney(summary.recurring.monthlyCommittedCents, summary.currency)} per month)${summary.recurring.pastDue ? `, ${summary.recurring.pastDue} past due` : ""}.` : ""}
        </p>
      ) : null}
    </div>
  );
}
