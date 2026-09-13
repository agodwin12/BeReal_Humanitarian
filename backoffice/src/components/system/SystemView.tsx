"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Activity, Database, Download, HardDrive, Mail, RefreshCw, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { formatBytes } from "@/components/content/MediaPicker";
import { ApiError, api, apiDownload, isDemoMode, toQuery } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { EmailLogEntry, PageMeta, SystemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function Dot({ ok, warn = false }: { ok: boolean; warn?: boolean }) {
  return <span className={cn("inline-block size-2.5 rounded-full", ok ? "bg-emerald-500" : warn ? "bg-amber-400" : "bg-brand-coral-500")} aria-hidden="true" />;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-brand-purple-50 px-3 py-2 text-[0.82rem]">
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-right text-muted-foreground">{value}</span>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Activity; title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
      <h2 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
        <Icon className="size-4 text-brand-purple-600" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

const uptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

export function SystemView() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    api
      .get<SystemStatus>("/api/system/status")
      .then(({ data }) => setStatus(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    load();
  }, [load]);

  const exportContent = async () => {
    setExporting(true);
    try {
      const filename = await apiDownload("/api/system/export", "be-real-content.json");
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="System" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!status) return <Skeleton className="h-64 w-full rounded-[14px]" />;

  const emailTotal = Object.values(status.email.last24h).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("rounded-[6px] font-bold", status.api.env === "production" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
          {status.api.env.toUpperCase()}
        </Badge>
        <span className="text-[0.8rem] text-muted-foreground">
          API v{status.api.version} · Node {status.api.node} · up {uptime(status.api.uptimeSeconds)}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button variant="coral" size="sm" onClick={exportContent} disabled={exporting}>
            <Download className="size-3.5" />
            {exporting ? "Exporting…" : "Download content backup"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Database} title="Database">
          <Row label="Connection" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.database.ok} />{status.database.ok ? `OK · ${status.database.latencyMs} ms` : status.database.error ?? "Down"}</span>} />
          <Row label="Database" value={status.database.name} />
          <Row label="Size" value={status.database.sizeBytes ? formatBytes(status.database.sizeBytes) : "—"} />
          <Row label="Migrations" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.migrations.pending.length === 0} warn />{status.migrations.applied.length} applied{status.migrations.pending.length ? ` · ${status.migrations.pending.length} pending` : ""}</span>} />
        </Panel>

        <Panel icon={HardDrive} title="Storage & media">
          <Row label="Driver" value={<span className="inline-flex items-center gap-1.5"><Dot ok />{status.storage.driver === "r2" ? `Cloudflare R2 · ${status.storage.r2Bucket}` : "Server folder (backed up daily with the database)"}</span>} />
          <Row label="Files" value={`${status.storage.mediaCount} · ${formatBytes(status.storage.mediaBytes)}`} />
          <Row label="Backup job" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.backup.configured && status.backup.status === "ok"} warn={!status.backup.configured} />{status.backup.configured ? `${status.backup.status ?? "?"} · ${status.backup.lastRunAt ? formatRelative(status.backup.lastRunAt) : "never"}` : "Not configured"}</span>} />
          {!status.backup.configured ? (
            <p className="text-[0.72rem] text-muted-foreground">No backup job has reported yet. On the server it runs every night at 03:15 UTC (deploy/vps/backup.sh); the button above downloads a content backup any time.</p>
          ) : status.backup.location ? (
            <p className="text-[0.72rem] text-muted-foreground">{status.backup.location}</p>
          ) : null}
        </Panel>

        <Panel icon={Mail} title="Email delivery">
          <Row label="Provider" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.email.configured} warn />{status.email.configured ? "Resend" : "Console only (no RESEND_API_KEY)"}</span>} />
          <Row label="From" value={<span className="truncate">{status.email.from}</span>} />
          <Row label="Last 24 h" value={emailTotal ? Object.entries(status.email.last24h).map(([k, v]) => `${v} ${k}`).join(" · ") : "none"} />
          <Row label="Last email" value={status.email.lastAt ? formatRelative(status.email.lastAt) : "—"} />
        </Panel>

        <Panel icon={ShieldCheck} title="Protection & preview">
          <Row label="Form anti-spam (Turnstile)" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.turnstile.configured} warn />{status.turnstile.configured ? "Configured" : "Honeypot only"}</span>} />
          <Row label="Draft preview secret" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.preview.configured} />{status.preview.configured ? "Configured" : "Missing"}</span>} />
          <Row label="Website" value={<a href={status.api.siteUrl} target="_blank" rel="noopener noreferrer" className="text-brand-purple-700 hover:underline">{status.api.siteUrl}</a>} />
        </Panel>

        <Panel icon={Activity} title="Stripe">
          <Row label="Mode" value={<span className="inline-flex items-center gap-1.5"><Dot ok={status.stripe.configured} warn />{status.stripe.mode.toUpperCase()}{status.stripe.configured ? "" : " · keys pending"}</span>} />
          <Row label="Webhook" value={status.stripe.webhookConfigured ? "Signing secret set" : "Not configured"} />
          <Row label="Events received" value={`${status.stripe.eventCount ?? 0}${status.stripe.lastEventAt ? ` · last ${formatRelative(status.stripe.lastEventAt)}` : ""}`} />
          <Link href="/donations/settings" className="text-[0.78rem] font-bold text-brand-purple-700 hover:underline">
            Donation settings
          </Link>
        </Panel>

        <Panel icon={Activity} title="Activity">
          <Row label="Audit entries, 24 h" value={String(status.audit.last24h)} />
          <Row label="Last action" value={status.audit.lastAction ? `${status.audit.lastAction} · ${formatRelative(status.audit.lastAt)}` : "—"} />
          <Link href="/system/audit" className="text-[0.78rem] font-bold text-brand-purple-700 hover:underline">
            Open the audit log
          </Link>
        </Panel>
      </div>

      <EmailLogTable />
    </div>
  );
}

const EMAIL_STATUS_ITEMS = { all: "All", sent: "Sent", failed: "Failed", console: "Console (dev)" };

function EmailLogTable() {
  const [rows, setRows] = useState<EmailLogEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await api.get<EmailLogEntry[]>(`/api/system/email-logs${toQuery({ status: status === "all" ? "" : status, q, page, pageSize: 50 })}`);
      setRows(data);
      setMeta(meta ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  return (
    <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
          <Mail className="size-4 text-brand-purple-600" />
          Email log
        </h2>
        <div className="relative ml-auto min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search recipient or subject" className="min-h-9 rounded-[10px] bg-white pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }} items={EMAIL_STATUS_ITEMS}>
          <SelectTrigger className="min-h-9 w-[150px] rounded-[10px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EMAIL_STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">When</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead className="pr-5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="pl-5" colSpan={5}>
                <Skeleton className="h-9 w-full" />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5 text-[0.8rem] text-muted-foreground" title={formatDateTime(row.createdAt)}>
                  {formatRelative(row.createdAt)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-[0.82rem]">{row.to}</TableCell>
                <TableCell className="max-w-[320px] truncate text-[0.82rem]" title={row.subject}>
                  {row.subject}
                </TableCell>
                <TableCell className="text-[0.76rem] text-muted-foreground">{row.kind ?? "—"}</TableCell>
                <TableCell className="pr-5">
                  <Badge
                    variant="outline"
                    className={cn("rounded-[6px] font-bold", row.status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.status === "failed" ? "border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700" : "border-border bg-muted text-muted-foreground")}
                    title={row.error ?? undefined}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={5}>
                No emails logged yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} emails
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
  );
}
