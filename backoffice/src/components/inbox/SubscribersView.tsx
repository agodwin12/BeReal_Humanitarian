"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, MailX, RefreshCw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, apiDownload, isDemoMode, toQuery } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { LOCALE_LABEL, type PageMeta, type Subscriber, type SubscriberStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = SubscriberStatus | "all";
type Counts = { subscribed: number; unsubscribed: number };

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function SubscribersView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";

  const [rows, setRows] = useState<Subscriber[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("subscribed");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Subscriber | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadCounts = useCallback(async () => {
    try {
      const { data } = await api.get<Counts>("/api/newsletter/subscribers/counts");
      setCounts(data);
    } catch {
      setCounts(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, meta } = await api.get<Subscriber[]>(
        `/api/newsletter/subscribers${toQuery({ status: tab, q, page, pageSize: 50 })}`,
      );
      setRows(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, q, page]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    if (isDemoMode) return;
    void loadCounts();
  }, [loadCounts]);

  const unsubscribe = async () => {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      const { data } = await api.post<Subscriber>(`/api/newsletter/subscribers/${confirm.id}/unsubscribe`);
      setRows((list) => (tab === "subscribed" ? list.filter((s) => s.id !== data.id) : list.map((s) => (s.id === data.id ? data : s))));
      toast.success(`${data.email} has been unsubscribed.`);
      setConfirm(null);
      void loadCounts();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await apiDownload(`/api/newsletter/subscribers/export?status=${tab}`);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Newsletter subscribers" />;

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "subscribed", label: "Subscribed", count: counts?.subscribed },
    { value: "unsubscribed", label: "Unsubscribed", count: counts?.unsubscribed },
    { value: "all", label: "All" },
  ];

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as Tab);
              setPage(1);
            }}
          >
            <TabsList className="h-10 rounded-[10px]">
              {tabs.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="rounded-[8px] px-3">
                  {item.label}
                  {item.count !== undefined ? (
                    <span className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[0.66rem] font-extrabold text-muted-foreground tabular-nums">
                      {item.count}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search email"
              className="min-h-10 rounded-[10px] bg-white pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="size-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
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
                <TableHead className="pl-5">Email</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Source page</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0
                ? [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5" colSpan={6}>
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow key={row.id} className={cn(busyId === row.id && "opacity-60")}>
                      <TableCell className="pl-5 font-bold text-foreground">{row.email}</TableCell>
                      <TableCell className="text-[0.85rem]">{LOCALE_LABEL[row.locale] ?? row.locale}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-[6px] font-bold",
                            row.status === "subscribed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {row.status === "subscribed" ? "Subscribed" : "Unsubscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[0.8rem] text-muted-foreground" title={formatDateTime(row.consentAt)}>
                        {row.status === "unsubscribed" && row.unsubscribedAt
                          ? `Left ${formatRelative(row.unsubscribedAt)}`
                          : `Given ${formatRelative(row.consentAt)}`}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-[0.78rem] text-muted-foreground">{row.sourcePage ?? "—"}</TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end">
                          {canEdit && row.status === "subscribed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-brand-coral-700 hover:text-brand-coral-700"
                              disabled={busyId === row.id}
                              onClick={() => setConfirm(row)}
                            >
                              <MailX className="size-3.5" />
                              Unsubscribe
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No subscribers match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} subscribers
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

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="rounded-[14px]">
          {confirm ? (
            <>
              <DialogHeader>
                <DialogTitle>Unsubscribe this address?</DialogTitle>
                <DialogDescription>
                  <strong className="text-foreground">{confirm.email}</strong> will stop receiving updates immediately. They can
                  subscribe again from the website at any time.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="coral" disabled={busyId === confirm.id} onClick={unsubscribe}>
                  Unsubscribe
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
