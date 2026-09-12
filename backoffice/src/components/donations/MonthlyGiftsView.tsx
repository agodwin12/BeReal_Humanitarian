"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, ExternalLink, FlaskConical, RefreshCw, Search, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode, toQuery } from "@/lib/api";
import { LOCALE_NAME } from "@/lib/content";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { DonationSubscription, DonationSummary, PageMeta, SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<SubscriptionStatus, string> = { pending: "Not confirmed", active: "Active", past_due: "Payment failed", canceled: "Canceled", incomplete: "Abandoned" };
const STATUS_CLASS: Record<SubscriptionStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  past_due: "border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700",
  canceled: "border-border bg-muted text-muted-foreground",
  incomplete: "border-border bg-muted text-muted-foreground",
};
const STATUS_ITEMS = { open: "Active + payment failed", all: "All", active: "Active", past_due: "Payment failed", canceled: "Canceled", pending: "Not confirmed", incomplete: "Abandoned" };
const EVENT_LABEL: Record<string, string> = { created: "Monthly gift started (checkout)", started: "First payment received", payment_received: "Monthly payment received", payment_failed: "Payment failed", status_changed: "Status changed", canceled: "Canceled", checkout_abandoned: "Checkout abandoned", note_updated: "Note updated" };

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-[6px] font-bold", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function MonthlyGiftsView({ initialId = null }: { initialId?: number | null }) {
  const me = useSessionUser();
  const canAct = me?.role === "super_admin";
  const [summary, setSummary] = useState<DonationSummary["recurring"] | null>(null);
  const [mode, setMode] = useState<DonationSummary["mode"] | null>(null);
  const [rows, setRows] = useState<DonationSubscription[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(initialId);

  const loadSummary = useCallback(() => {
    api
      .get<DonationSummary>("/api/donations/summary")
      .then(({ data }) => {
        setSummary(data.recurring);
        setMode(data.mode);
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await api.get<DonationSubscription[]>(`/api/donations/subscriptions${toQuery({ q, status, page, pageSize: 25 })}`);
      setRows(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    if (isDemoMode) return;
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  if (isDemoMode) return <DemoNotice screen="Monthly gifts" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  const replace = (s: DonationSubscription) => setRows((list) => list.map((r) => (r.id === s.id ? s : r)));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {mode ? (
          <Badge variant="outline" className={cn("rounded-[6px] font-bold", mode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
            {mode === "live" ? "LIVE" : mode === "test" ? "STRIPE TEST MODE" : "SIMULATED — no Stripe keys yet"}
          </Badge>
        ) : null}
        <span className="text-[0.78rem] text-muted-foreground">Stripe charges the card every month and tells the API; each payment gets its own receipt. Donors cancel from the link in their receipt, or you cancel here.</span>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Active monthly donors", value: String(summary.active), sub: `${summary.newThisMonth} new this month` },
            { label: "Committed per month", value: formatMoney(summary.monthlyCommittedCents), sub: "sum of active gifts" },
            { label: "Payment failed", value: String(summary.pastDue), sub: "Stripe retries automatically" },
            { label: "Canceled", value: String(summary.canceled), sub: "all time" },
          ].map((item) => (
            <div key={item.label} className="rounded-[10px] bg-brand-purple-50 px-3.5 py-3">
              <div className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</div>
              <div className="mt-1 text-2xl font-bold text-brand-purple-950 tabular-nums">{item.value}</div>
              <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{item.sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <Skeleton className="h-24 w-full rounded-[14px]" />
      )}

      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or Stripe subscription id" className="min-h-10 rounded-[10px] bg-white pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v ?? "open"); setPage(1); }} items={STATUS_ITEMS}>
            <SelectTrigger className="min-h-10 w-[210px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { load(); loadSummary(); }} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Donor</TableHead>
              <TableHead className="text-right">Per month</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="pr-5 text-right">Next charge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell className="pl-5" colSpan={6}>
                  <Skeleton className="h-9 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const received = row.donations.filter((d) => ["paid", "partially_refunded", "refunded"].includes(d.status)).reduce((n, d) => n + d.amountCents, 0);
                return (
                  <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer">
                    <TableCell className="pl-5">
                      <div className="font-bold text-foreground">
                        {row.donorName}
                        {row.anonymous ? <span className="ml-1.5 text-[0.66rem] font-semibold text-muted-foreground">(anonymous)</span> : null}
                      </div>
                      <div className="text-[0.76rem] text-muted-foreground">
                        {row.donorEmail} · {LOCALE_NAME[row.locale]}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatMoney(row.amountCents, row.currency)}
                      {row.feeCoverCents > 0 ? <span className="ml-1.5 text-[0.66rem] font-semibold text-muted-foreground">+fees</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-[0.82rem] tabular-nums text-muted-foreground">
                      {formatMoney(received, row.currency)} · {row.paymentsCount}×
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-[0.8rem] text-muted-foreground" title={formatDateTime(row.startedAt ?? row.createdAt)}>
                      {formatRelative(row.startedAt ?? row.createdAt)}
                    </TableCell>
                    <TableCell className="pr-5 text-right text-[0.8rem] text-muted-foreground">
                      {row.status === "active" || row.status === "past_due" ? formatDateTime(row.currentPeriodEnd) : row.status === "canceled" ? `Canceled ${formatRelative(row.canceledAt)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={6}>
                  No monthly gifts match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} monthly gifts
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <SubscriptionSheet key={selectedId ?? "none"} id={selectedId} canAct={canAct} simulated={mode === "simulated"} onClose={() => setSelectedId(null)} onChange={(s) => { replace(s); loadSummary(); }} />
    </div>
  );
}

function SubscriptionSheet({ id, canAct, simulated, onClose, onChange }: { id: number | null; canAct: boolean; simulated: boolean; onClose: () => void; onChange: (s: DonationSubscription) => void }) {
  const [sub, setSub] = useState<DonationSubscription | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (id === null) return;
    api
      .get<DonationSubscription>(`/api/donations/subscriptions/${id}`)
      .then(({ data }) => {
        setSub(data);
        setNote(data.note ?? "");
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, [id]);

  const run = async (fn: () => Promise<DonationSubscription>, success: string) => {
    setBusy(true);
    try {
      const s = await fn();
      setSub(s);
      onChange(s);
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const open = sub ? sub.status === "active" || sub.status === "past_due" : false;

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!sub ? (
          <div className="grid gap-3 p-5">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <SheetTitle className="flex items-center gap-2 text-lg font-bold text-brand-purple-950">
                  <CalendarHeart className="size-5 text-brand-purple-600" />
                  {formatMoney(sub.amountCents, sub.currency)} / month
                </SheetTitle>
                <StatusBadge status={sub.status} />
                {sub.provider === "simulated" ? (
                  <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                    Simulated
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                Monthly gift #{sub.id} · {sub.donorName} · {sub.donorEmail} · {LOCALE_NAME[sub.locale]}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                {canAct && open ? (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmCancel(true)} className="border-brand-coral-100 text-brand-coral-700 hover:bg-brand-coral-50">
                    <XCircle className="size-3.5" />
                    Cancel monthly gift
                  </Button>
                ) : null}
                {canAct && simulated && open && sub.provider === "simulated" ? (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => run(async () => (await api.post<DonationSubscription>(`/api/donations/subscriptions/${sub.id}/simulate-charge`)).data, "Simulated monthly payment recorded (receipt in the email log).")}>
                    <FlaskConical className="size-3.5" />
                    Simulate next monthly payment
                  </Button>
                ) : null}
                {sub.stripeUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={sub.stripeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      Open in Stripe
                    </a>
                  </Button>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[0.82rem]">
                {[
                  ["Per month", formatMoney(sub.amountCents, sub.currency)],
                  ["Fee cover added by donor", sub.feeCoverCents > 0 ? formatMoney(sub.feeCoverCents, sub.currency) : "—"],
                  ["Payments received", String(sub.paymentsCount)],
                  ["Total received", formatMoney(sub.donations.filter((d) => ["paid", "partially_refunded", "refunded"].includes(d.status)).reduce((n, d) => n + d.amountCents, 0), sub.currency)],
                  ["Started", sub.startedAt ? formatDateTime(sub.startedAt) : "—"],
                  ["Last payment", sub.lastPaymentAt ? formatDateTime(sub.lastPaymentAt) : "—"],
                  ["Next charge", open ? formatDateTime(sub.currentPeriodEnd) : "—"],
                  ["Canceled", sub.canceledAt ? `${formatDateTime(sub.canceledAt)} by ${sub.canceledBy ?? "—"}${sub.cancelReason ? ` · ${sub.cancelReason}` : ""}` : "—"],
                  ["Stripe subscription", sub.providerSubscriptionId ?? "—"],
                  ["Stripe customer", sub.providerCustomerId ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[10px] bg-brand-purple-50 px-3 py-2">
                    <dt className="text-[0.66rem] font-bold text-muted-foreground uppercase tracking-wider">{k}</dt>
                    <dd className="truncate font-semibold text-foreground" title={String(v)}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              {sub.message ? (
                <div className="rounded-[10px] border border-border bg-white px-3 py-2 text-[0.85rem] whitespace-pre-wrap">
                  <span className="mb-1 block text-[0.66rem] font-bold text-muted-foreground uppercase tracking-wider">Message from the donor</span>
                  {sub.message}
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-[0.82rem] font-bold">
                  <Checkbox checked={sub.anonymous} disabled={!canAct || busy} onCheckedChange={(c) => run(async () => (await api.patch<DonationSubscription>(`/api/donations/subscriptions/${sub.id}`, { anonymous: c === true })).data, "Saved.")} />
                  Anonymous — never name this donor publicly
                </label>
                <Label className="text-[0.8rem] font-bold">Internal note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canAct || busy} className="min-h-20 rounded-[10px] bg-white" placeholder="Visible to staff only" />
                {canAct ? (
                  <div className="flex justify-end">
                    <Button variant="purple" size="sm" disabled={busy || note === (sub.note ?? "")} onClick={() => run(async () => (await api.patch<DonationSubscription>(`/api/donations/subscriptions/${sub.id}`, { note })).data, "Note saved.")}>
                      Save note
                    </Button>
                  </div>
                ) : null}
              </div>

              <section className="grid gap-2 border-t border-border pt-4">
                <h3 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Payments</h3>
                {sub.donations.length === 0 ? <p className="text-[0.8rem] text-muted-foreground">No payment yet.</p> : null}
                <div className="grid gap-1.5">
                  {sub.donations.map((d) => (
                    <a key={d.id} href={`/donations?id=${d.id}`} className="flex items-center justify-between rounded-[10px] border border-border bg-white px-3 py-2 text-[0.8rem] hover:bg-brand-purple-50">
                      <span>
                        <span className="font-mono text-[0.76rem]">{d.receiptNumber ?? "—"}</span>
                        <span className="ml-2 text-muted-foreground">{formatDateTime(d.paidAt ?? d.createdAt)}</span>
                      </span>
                      <span className="font-bold tabular-nums">{formatMoney(d.amountCents, d.currency)}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="grid gap-2 border-t border-border pt-4">
                <h3 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Timeline</h3>
                <ol className="grid gap-1.5">
                  {sub.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-[0.8rem]">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-purple-400" aria-hidden="true" />
                      <span>
                        <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                        <span className="ml-1.5 text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                        {e.actorName ? <span className="ml-1.5 text-muted-foreground">· {e.actorName}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <ConfirmDialog
              open={confirmCancel}
              onOpenChange={setConfirmCancel}
              title="Cancel this monthly gift?"
              description={`${sub.donorName} will not be charged again. Payments already received stay in the ledger. This cannot be undone — the donor would have to start a new monthly gift.`}
              cta="Cancel the monthly gift"
              destructive
              busy={busy}
              onConfirm={() => { setConfirmCancel(false); void run(async () => (await api.post<DonationSubscription>(`/api/donations/subscriptions/${sub.id}/cancel`, { reason: "canceled by staff" })).data, "Monthly gift canceled."); }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
