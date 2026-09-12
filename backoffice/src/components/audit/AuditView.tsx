"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ApiError, api, isDemoMode, toQuery } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry, PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_TONE = (action: string) =>
  action.endsWith("_failed") || action.includes("deactivated")
    ? "bg-brand-coral-50 text-brand-coral-700 border-brand-coral-100"
    : action.startsWith("auth.")
      ? "bg-brand-purple-50 text-brand-purple-700 border-brand-purple-100"
      : "bg-muted text-foreground border-border";

function Json({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <pre className="max-h-64 overflow-auto rounded-[8px] bg-brand-purple-950 p-3 text-[0.72rem] leading-relaxed text-brand-purple-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, meta } = await api.get<AuditEntry[]>(
        `/api/audit-logs${toQuery({
          q,
          action: action === "all" ? "" : action,
          from: from ? new Date(from).toISOString() : "",
          to: to ? new Date(`${to}T23:59:59`).toISOString() : "",
          page,
          pageSize: 50,
        })}`,
      );
      setEntries(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [q, action, from, to, page]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    if (isDemoMode) return;
    api.get<string[]>("/api/audit-logs/actions").then(({ data }) => setActions(data)).catch(() => setActions([]));
  }, []);

  if (isDemoMode) return <DemoNotice screen="The audit log" />;

  const actionItems = { all: "All actions", ...Object.fromEntries(actions.map((a) => [a, a])) };

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search actor, action or record id"
              className="min-h-10 rounded-[10px] bg-white pl-9"
            />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v ?? "all"); setPage(1); }} items={actionItems}>
            <SelectTrigger className="min-h-10 w-[220px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(actionItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="min-h-10 w-[160px] rounded-[10px] bg-white" aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="min-h-10 w-[160px] rounded-[10px] bg-white" aria-label="To date" />
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
        {loadError ? (
          <p className="p-5 text-sm font-semibold text-brand-coral-700">{loadError}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-5" />
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead className="pr-5">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && entries.length === 0
                ? [0, 1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5" colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                : entries.map((entry) => {
                    const open = openId === entry.id;
                    const who = entry.actor?.name ?? entry.actorName ?? "System";
                    return (
                      <TableRowGroup key={String(entry.id)}>
                        <TableRow className="cursor-pointer" onClick={() => setOpenId(open ? null : entry.id)}>
                          <TableCell className="pl-5 text-muted-foreground">
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[0.8rem] tabular-nums">{formatDateTime(entry.createdAt)}</TableCell>
                          <TableCell>
                            <div className="font-bold text-foreground">{who}</div>
                            {entry.actor?.email ? <div className="text-[0.74rem] text-muted-foreground">{entry.actor.email}</div> : null}
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-block rounded-[6px] border px-2 py-0.5 font-mono text-[0.72rem] font-bold", ACTION_TONE(entry.action))}>
                              {entry.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-[0.8rem] text-muted-foreground">
                            {entry.entity ? `${entry.entity} #${entry.entityId ?? "—"}` : "—"}
                          </TableCell>
                          <TableCell className="pr-5 font-mono text-[0.74rem] text-muted-foreground">{entry.ip ?? "—"}</TableCell>
                        </TableRow>
                        {open ? (
                          <TableRow className="bg-brand-purple-50/60 hover:bg-brand-purple-50/60">
                            <TableCell colSpan={6} className="px-5 py-4">
                              <div className="grid gap-3 lg:grid-cols-3">
                                <div>
                                  <div className="mb-1 text-[0.68rem] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">Before</div>
                                  <Json value={entry.before} />
                                </div>
                                <div>
                                  <div className="mb-1 text-[0.68rem] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">After</div>
                                  <Json value={entry.after} />
                                </div>
                                <div>
                                  <div className="mb-1 text-[0.68rem] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">Details</div>
                                  <Json value={entry.meta} />
                                  {entry.userAgent ? (
                                    <p className="mt-2 text-[0.7rem] text-muted-foreground break-all">{entry.userAgent}</p>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableRowGroup>
                    );
                  })}
              {!loading && entries.length === 0 ? (
                <TableRow>
                  <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    Nothing recorded for these filters yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total} entries</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// React needs a keyed wrapper for the (row + expanded row) pair; a fragment
// with a key is exactly that.
function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
