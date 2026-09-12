"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarHeart, Download, ExternalLink, FileText, Mail, RefreshCw, Search, UserSearch } from "lucide-react";

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
import { DemoNotice } from "@/components/layout/DemoNotice";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, apiDownload, isDemoMode, toQuery } from "@/lib/api";
import { LOCALE_NAME } from "@/lib/content";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { Donation, DonationStatus, DonationSummary, DonorLookup, PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DonationStatus, string> = { pending: "Pending", paid: "Paid", failed: "Failed", expired: "Expired", refunded: "Refunded", partially_refunded: "Partly refunded" };
const STATUS_CLASS: Record<DonationStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700",
  expired: "border-border bg-muted text-muted-foreground",
  refunded: "border-brand-purple-100 bg-brand-purple-50 text-brand-purple-700",
  partially_refunded: "border-brand-purple-100 bg-brand-purple-50 text-brand-purple-700",
};
const STATUS_ITEMS = { paid_any: "Paid (incl. refunds)", all: "All", paid: "Paid", pending: "Pending", refunded: "Refunded", partially_refunded: "Partly refunded", expired: "Expired", failed: "Failed" };
const LOCALE_ITEMS = { all: "All languages", en: "English", fr: "French", es: "Spanish" };
const FREQUENCY_ITEMS = { all: "One-time + monthly", one_time: "One-time gifts", monthly: "Monthly payments" };
const EVENT_LABEL: Record<string, string> = { checkout_created: "Checkout started", recurring_charge: "Monthly charge", paid: "Payment received", receipt_sent: "Receipt emailed", receipt_resent: "Receipt resent", receipt_failed: "Receipt email failed", refunded: "Refund recorded", expired: "Checkout expired", failed: "Payment failed", dispute_opened: "Dispute opened", note_updated: "Note updated" };

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function StatusBadge({ status }: { status: DonationStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-[6px] font-bold", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function Stat({ label, totals, currency }: { label: string; totals: { count: number; grossCents: number; netCents: number }; currency: string }) {
  return (
    <div className="rounded-[10px] bg-brand-purple-50 px-3.5 py-3">
      <div className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand-purple-950 tabular-nums">{formatMoney(totals.grossCents, currency)}</div>
      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">
        {totals.count} gift{totals.count === 1 ? "" : "s"} · net {formatMoney(totals.netCents, currency)}
      </div>
    </div>
  );
}

export function DonationsView({ initialId = null }: { initialId?: number | null }) {
  const me = useSessionUser();
  const canAct = me?.role === "super_admin";
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [rows, setRows] = useState<Donation[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("paid_any");
  const [locale, setLocale] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [donorEmail, setDonorEmail] = useState("");
  const [donor, setDonor] = useState<DonorLookup | null>(null);
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);

  const loadSummary = useCallback(() => {
    api
      .get<DonationSummary>("/api/donations/summary")
      .then(({ data }) => setSummary(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await api.get<Donation[]>(`/api/donations${toQuery({ q, status, locale: locale === "all" ? "" : locale, frequency: frequency === "all" ? "" : frequency, from, to, page, pageSize: 25 })}`);
      setRows(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, status, locale, frequency, from, to, page]);

  useEffect(() => {
    if (isDemoMode) return;
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  const replace = (d: Donation) => setRows((list) => list.map((r) => (r.id === d.id ? d : r)));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await apiDownload(`/api/donations/export${toQuery({ year: exportYear })}`);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const lookupDonor = async () => {
    if (!donorEmail.trim()) return;
    try {
      const { data } = await api.get<DonorLookup>(`/api/donations/donors${toQuery({ email: donorEmail.trim() })}`);
      setDonor(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (isDemoMode) return <DemoNotice screen="Donations" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  const currency = summary?.currency ?? "usd";
  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));
  const yearItems = Object.fromEntries(years.map((y) => [y, `Fiscal year ${y}`]));
  const chart = (summary?.months ?? []).map((m) => ({ ...m, label: m.month.slice(5), gross: m.grossCents / 100, net: m.netCents / 100 }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {summary ? (
          <Badge variant="outline" className={cn("rounded-[6px] font-bold", summary.mode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
            {summary.mode === "live" ? "LIVE" : summary.mode === "test" ? "STRIPE TEST MODE" : "SIMULATED — no Stripe keys yet"}
          </Badge>
        ) : null}
        <span className="text-[0.78rem] text-muted-foreground">Stripe holds the money and the cards; this is the ledger. Refunds made in Stripe flow back here automatically.</span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={exportYear} onValueChange={(v) => v && setExportYear(v)} items={yearItems}>
            <SelectTrigger className="min-h-9 w-[160px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {yearItems[y]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canAct ? (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
              <Download className="size-3.5" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          ) : null}
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Today" totals={summary.periods.today} currency={currency} />
          <Stat label="This month" totals={summary.periods.month} currency={currency} />
          <Stat label={`This year (${summary.year})`} totals={summary.periods.year} currency={currency} />
          <Stat label="All time" totals={summary.periods.allTime} currency={currency} />
        </div>
      ) : (
        <Skeleton className="h-24 w-full rounded-[14px]" />
      )}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
          <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Last 12 months</h2>
          <div className="h-56">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#ece8f3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#716c80" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#716c80" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(value, name) => [formatMoney(Math.round(Number(value ?? 0) * 100), currency), name === "gross" ? "Gross" : "Net"]} labelFormatter={(l) => `Month ${l}`} contentStyle={{ borderRadius: 10, border: "1px solid #e8e3ef", fontSize: 12 }} />
                  <Bar dataKey="gross" fill="#5626a6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" fill="#f26058" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
            <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Payouts to the bank</h2>
            {summary?.payouts && !("error" in summary.payouts) ? (
              <dl className="grid gap-1.5 text-[0.82rem]">
                <div className="flex justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
                  <dt className="font-semibold">Available</dt>
                  <dd className="font-bold tabular-nums">{formatMoney(summary.payouts.availableCents, currency)}</dd>
                </div>
                <div className="flex justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
                  <dt className="font-semibold">In transit</dt>
                  <dd className="font-bold tabular-nums">{formatMoney(summary.payouts.pendingCents, currency)}</dd>
                </div>
                {summary.payouts.recent.map((p) => (
                  <div key={p.id} className="flex justify-between px-3 py-1 text-[0.76rem] text-muted-foreground">
                    <span>
                      {p.status} · {formatRelative(p.arrivalDate)}
                    </span>
                    <span className="tabular-nums">{formatMoney(p.amountCents, p.currency)}</span>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[0.8rem] text-muted-foreground">{summary?.payouts && "error" in summary.payouts ? summary.payouts.error : "Read from Stripe once the account keys are set."}</p>
            )}
          </Card>

          <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
            <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Breakdown (12 months)</h2>
            <div className="grid gap-1 text-[0.8rem]">
              {summary
                ? Object.entries(summary.byLocale).map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span>{LOCALE_NAME[l as keyof typeof LOCALE_NAME] ?? l}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {v.count} · {formatMoney(v.grossCents, currency)}
                      </span>
                    </div>
                  ))
                : null}
              <div className="my-1 h-px bg-border" />
              {summary
                ? Object.values(summary.byBand).map((b) => (
                    <div key={b.label} className="flex justify-between">
                      <span>{b.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {b.count} · {formatMoney(b.grossCents, currency)}
                      </span>
                    </div>
                  ))
                : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email, receipt or Stripe id" className="min-h-10 rounded-[10px] bg-white pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v ?? "paid_any"); setPage(1); }} items={STATUS_ITEMS}>
            <SelectTrigger className="min-h-10 w-[190px] rounded-[10px] bg-white">
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
          <Select value={locale} onValueChange={(v) => { setLocale(v ?? "all"); setPage(1); }} items={LOCALE_ITEMS}>
            <SelectTrigger className="min-h-10 w-[160px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOCALE_ITEMS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={frequency} onValueChange={(v) => { setFrequency(v ?? "all"); setPage(1); }} items={FREQUENCY_ITEMS}>
            <SelectTrigger className="min-h-10 w-[190px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_ITEMS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-1">
            <Label className="text-[0.7rem] font-bold text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          <div className="grid gap-1">
            <Label className="text-[0.7rem] font-bold text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { load(); loadSummary(); }} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <UserSearch className="size-4 text-brand-purple-600" />
          <Input value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupDonor()} placeholder="Donor lookup by email" className="min-h-9 w-[280px] rounded-[10px] bg-white" />
          <Button variant="outline" size="sm" onClick={lookupDonor} disabled={!donorEmail.trim()}>
            Find donor
          </Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Receipt</TableHead>
              <TableHead>Donor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="pr-5 text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell className="pl-5" colSpan={7}>
                  <Skeleton className="h-9 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer">
                  <TableCell className="pl-5 font-mono text-[0.78rem]">{row.receiptNumber ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">
                      {row.donorName}
                      {row.anonymous ? <span className="ml-1.5 text-[0.66rem] font-semibold text-muted-foreground">(anonymous)</span> : null}
                    </div>
                    <div className="text-[0.76rem] text-muted-foreground">{row.donorEmail}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatMoney(row.amountCents, row.currency)}
                    {row.frequency === "monthly" ? <span className="ml-1.5 rounded-[5px] bg-brand-purple-100 px-1.5 py-0.5 text-[0.62rem] font-extrabold text-brand-purple-700 uppercase">Monthly</span> : null}
                    {row.feeCoverCents > 0 ? <span className="ml-1.5 text-[0.66rem] font-semibold text-muted-foreground">+fees</span> : null}
                  </TableCell>
                  <TableCell className="text-right text-[0.82rem] tabular-nums text-muted-foreground">{formatMoney(row.netCents, row.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-[0.8rem] uppercase text-muted-foreground">{row.locale}</TableCell>
                  <TableCell className="pr-5 text-right text-[0.8rem] text-muted-foreground" title={formatDateTime(row.paidAt ?? row.createdAt)}>
                    {formatRelative(row.paidAt ?? row.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={7}>
                  No donations match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} donations
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

      <DonationSheet key={selectedId ?? "none"} id={selectedId} canAct={canAct} onClose={() => setSelectedId(null)} onChange={(d) => { replace(d); loadSummary(); }} />

      <Sheet open={donor !== null} onOpenChange={(o) => !o && setDonor(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {donor ? (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="text-lg font-bold text-brand-purple-950">{donor.names.join(" / ") || donor.email}</SheetTitle>
                <SheetDescription>
                  {donor.email} · {donor.gifts} gift{donor.gifts === 1 ? "" : "s"} · {formatMoney(donor.grossCents, currency)} total
                  {donor.firstGiftAt ? ` · since ${formatDateTime(donor.firstGiftAt)}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-2 px-4 pb-6">
                {donor.donations.length === 0 ? <p className="text-[0.82rem] text-muted-foreground">No donations for this email.</p> : null}
                {donor.donations.map((d) => (
                  <button key={d.id} type="button" onClick={() => { setDonor(null); setSelectedId(d.id); }} className="flex items-center justify-between rounded-[10px] border border-border bg-white px-3 py-2 text-left hover:bg-brand-purple-50">
                    <span>
                      <span className="font-mono text-[0.76rem]">{d.receiptNumber ?? "—"}</span>
                      <span className="ml-2 text-[0.76rem] text-muted-foreground">{formatDateTime(d.paidAt ?? d.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span className="font-bold tabular-nums">{formatMoney(d.amountCents, d.currency)}</span>
                    </span>
                  </button>
                ))}
                <p className="text-[0.72rem] text-muted-foreground">Card details are never stored here — they stay with Stripe.</p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DonationSheet({ id, canAct, onClose, onChange }: { id: number | null; canAct: boolean; onClose: () => void; onChange: (d: Donation) => void }) {
  const [donation, setDonation] = useState<Donation | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id === null) return;
    api
      .get<Donation>(`/api/donations/${id}`)
      .then(({ data }) => {
        setDonation(data);
        setNote(data.note ?? "");
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, [id]);

  const run = async (fn: () => Promise<Donation>, success: string) => {
    setBusy(true);
    try {
      const d = await fn();
      setDonation(d);
      onChange(d);
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!donation ? (
          <div className="grid gap-3 p-5">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <SheetTitle className="text-lg font-bold text-brand-purple-950">{formatMoney(donation.amountCents, donation.currency)}</SheetTitle>
                <StatusBadge status={donation.status} />
                {donation.provider === "simulated" ? (
                  <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                    Simulated
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                {donation.receiptNumber ? `Receipt ${donation.receiptNumber} · ` : ""}
                {donation.donorName} · {donation.donorEmail} · {LOCALE_NAME[donation.locale]}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                {canAct && donation.receiptNumber ? (
                  <Button variant="coral" size="sm" disabled={busy} onClick={() => run(async () => (await api.post<Donation>(`/api/donations/${donation.id}/resend-receipt`)).data, `Receipt resent to ${donation.donorEmail}.`)}>
                    <Mail className="size-3.5" />
                    Resend receipt
                  </Button>
                ) : null}
                {donation.receiptNumber ? (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => apiDownload(`/api/donations/${donation.id}/receipt.pdf`, `${donation.receiptNumber}.pdf`).catch((err) => toast.error(errorMessage(err)))}>
                    <FileText className="size-3.5" />
                    Receipt PDF
                  </Button>
                ) : null}
                {donation.stripeUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={donation.stripeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      Open in Stripe
                    </a>
                  </Button>
                ) : null}
                {donation.subscription ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/donations/monthly?id=${donation.subscription.id}`}>
                      <CalendarHeart className="size-3.5" />
                      Monthly gift #{donation.subscription.id} · {donation.subscription.status}
                    </a>
                  </Button>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[0.82rem]">
                {[
                  ["Gross", formatMoney(donation.amountCents, donation.currency)],
                  ["Gift", donation.frequency === "monthly" ? `Monthly gift #${donation.subscriptionId ?? "—"}` : "One-time"],
                  ["Fee cover added by donor", donation.feeCoverCents > 0 ? formatMoney(donation.feeCoverCents, donation.currency) : "—"],
                  ["Processing fee", donation.feeCents === null ? "—" : formatMoney(donation.feeCents, donation.currency)],
                  ["Refunded", formatMoney(donation.refundedCents, donation.currency)],
                  ["Net", formatMoney(donation.netCents, donation.currency)],
                  ["Paid at", donation.paidAt ? formatDateTime(donation.paidAt) : "—"],
                  ["Receipt emailed", donation.receiptSentAt ? `${formatDateTime(donation.receiptSentAt)} (${donation.receiptSendCount}×)` : "—"],
                  ["Source page", donation.sourcePage ?? "—"],
                  ["Payment reference", donation.providerPaymentIntentId ?? donation.providerSessionId ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[10px] bg-brand-purple-50 px-3 py-2">
                    <dt className="text-[0.66rem] font-bold text-muted-foreground uppercase tracking-wider">{k}</dt>
                    <dd className="truncate font-semibold text-foreground" title={String(v)}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              {donation.message ? (
                <div className="rounded-[10px] border border-border bg-white px-3 py-2 text-[0.85rem] whitespace-pre-wrap">
                  <span className="mb-1 block text-[0.66rem] font-bold text-muted-foreground uppercase tracking-wider">Message from the donor</span>
                  {donation.message}
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-[0.82rem] font-bold">
                  <Checkbox checked={donation.anonymous} disabled={!canAct || busy} onCheckedChange={(c) => run(async () => (await api.patch<Donation>(`/api/donations/${donation.id}`, { anonymous: c === true })).data, "Saved.")} />
                  Anonymous — never name this donor publicly
                </label>
                <Label className="text-[0.8rem] font-bold">Internal note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canAct || busy} className="min-h-20 rounded-[10px] bg-white" placeholder="Visible to staff only" />
                {canAct ? (
                  <div className="flex justify-end">
                    <Button variant="purple" size="sm" disabled={busy || note === (donation.note ?? "")} onClick={() => run(async () => (await api.patch<Donation>(`/api/donations/${donation.id}`, { note })).data, "Note saved.")}>
                      Save note
                    </Button>
                  </div>
                ) : null}
              </div>

              <section className="grid gap-2 border-t border-border pt-4">
                <h3 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Timeline</h3>
                <ol className="grid gap-1.5">
                  {donation.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-[0.8rem]">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-purple-400" aria-hidden="true" />
                      <span>
                        <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                        <span className="ml-1.5 text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                        {e.actorName ? <span className="ml-1.5 text-muted-foreground">· {e.actorName}</span> : null}
                        {e.data && "error" in e.data ? <span className="ml-1.5 text-brand-coral-700">{String(e.data.error)}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
