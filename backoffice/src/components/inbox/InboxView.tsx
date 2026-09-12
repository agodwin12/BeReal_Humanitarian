"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, ExternalLink, NotebookPen, RefreshCw, Reply, Search, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { refreshInboxCounts, useInboxCounts } from "@/hooks/use-inbox-counts";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, apiDownload, isDemoMode, toQuery } from "@/lib/api";
import { FIELD_LABELS, FORM_FIELDS, HIGHLIGHT_FIELDS, INBOX, LONG_FIELDS, formatFieldValue } from "@/lib/formFields";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import {
  LOCALE_LABEL,
  SUBMISSION_STATUS_LABEL,
  type Assignee,
  type FormType,
  type Submission,
  type SubmissionNote,
  type SubmissionStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: SubmissionStatus[] = ["new", "in_review", "contacted", "closed"];
const STATUS_ITEMS = Object.fromEntries(STATUSES.map((s) => [s, SUBMISSION_STATUS_LABEL[s]]));

const STATUS_CLASS: Record<SubmissionStatus, string> = {
  new: "border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700",
  in_review: "border-amber-200 bg-amber-50 text-amber-700",
  contacted: "border-brand-purple-100 bg-brand-purple-50 text-brand-purple-700",
  closed: "border-border bg-muted text-muted-foreground",
};

const SPAM_REASON: Record<string, string> = {
  honeypot: "Honeypot field was filled in",
  turnstile_failed: "Turnstile challenge failed",
  turnstile_missing: "Turnstile token missing",
  turnstile_error: "Turnstile could not be verified",
};

type Tab = "all" | SubmissionStatus | "spam";

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-[6px] font-bold", STATUS_CLASS[status])}>
      {SUBMISSION_STATUS_LABEL[status]}
    </Badge>
  );
}

function LocaleBadge({ locale }: { locale: Submission["locale"] }) {
  return (
    <Badge variant="outline" className="rounded-[6px] border-border bg-white font-bold text-muted-foreground uppercase">
      {locale}
    </Badge>
  );
}

export function InboxView({ type }: { type: FormType }) {
  const me = useSessionUser();
  const counts = useInboxCounts();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Submission[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [exporting, setExporting] = useState(false);

  const inbox = INBOX[type];
  const restricted = inbox.roles && me ? !inbox.roles.includes(me.role) : false;
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const inboxCount = counts?.[type];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, meta } = await api.get<Submission[]>(
        `/api/form-submissions${toQuery({
          type,
          spam: tab === "spam" ? "true" : "false",
          status: tab === "all" || tab === "spam" ? "all" : tab,
          q,
          page,
          pageSize: 25,
        })}`,
      );
      setRows(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [type, tab, q, page]);

  useEffect(() => {
    if (isDemoMode || restricted) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load, restricted]);

  // Editors and above can assign; Read-only never sees the picker.
  useEffect(() => {
    if (isDemoMode || !canEdit) return;
    api
      .get<Assignee[]>("/api/users/assignable")
      .then(({ data }) => setAssignees(data))
      .catch(() => setAssignees([]));
  }, [canEdit]);

  // Deep link from the staff alert email: /inbox/<type>?id=123
  useEffect(() => {
    const id = Number(searchParams.get("id"));
    if (id > 0) setSelectedId(id);
  }, [searchParams]);

  const closeDetail = () => {
    setSelectedId(null);
    if (searchParams.get("id")) router.replace(pathname);
  };

  const applyChange = (updated: Submission) => {
    setRows((list) => {
      const next = list.map((row) => (row.id === updated.id ? { ...row, ...updated, notes: row.notes } : row));
      // A row that no longer matches the current tab drops out of the list.
      if (tab === "spam" && !updated.isSpam) return next.filter((row) => row.id !== updated.id);
      if (tab !== "all" && tab !== "spam" && updated.status !== tab) return next.filter((row) => row.id !== updated.id);
      return next;
    });
    void refreshInboxCounts();
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await apiDownload(`/api/form-submissions/export?type=${type}`);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen={inbox.title} />;

  if (me && restricted) {
    return (
      <Card className="gap-2 rounded-[14px] border border-brand-coral-100 bg-brand-coral-50 px-5 ring-0 shadow-none">
        <h2 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-brand-coral-700 uppercase">
          <ShieldAlert className="size-4" />
          Restricted
        </h2>
        <p className="text-sm text-brand-coral-700">
          The Request Assistance inbox is limited to Super Admins because it holds personal details from people in
          hardship. Ask a Super Admin if you need something from it.
        </p>
      </Card>
    );
  }

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "all", label: "All", count: inboxCount?.total },
    { value: "new", label: "New", count: inboxCount?.new },
    { value: "in_review", label: "In review" },
    { value: "contacted", label: "Contacted" },
    { value: "closed", label: "Closed" },
    { value: "spam", label: "Spam", count: inboxCount?.spam },
  ];

  const highlights = HIGHLIGHT_FIELDS[type] ?? [];

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
                    <span
                      className={cn(
                        "rounded-[6px] px-1.5 py-0.5 text-[0.66rem] font-extrabold tabular-nums",
                        item.value === "new" && item.count > 0
                          ? "bg-brand-coral-500 text-white"
                          : item.value === "spam" && item.count > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
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
              placeholder="Search name or email"
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
                <TableHead className="pl-5">From</TableHead>
                {inbox.headline ? <TableHead>{FIELD_LABELS[inbox.headline]}</TableHead> : null}
                {highlights.slice(0, 2).map((field) => (
                  <TableHead key={field}>{FIELD_LABELS[field]}</TableHead>
                ))}
                <TableHead>Language</TableHead>
                <TableHead>{tab === "spam" ? "Reason" : "Status"}</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="pr-5 text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0
                ? [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5" colSpan={8}>
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={cn("cursor-pointer", row.status === "new" && !row.isSpam && "bg-brand-coral-50/40")}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-purple-100 text-[0.72rem] font-extrabold text-brand-purple-700">
                            {initials(row.name ?? row.email ?? "?")}
                          </span>
                          <div className="leading-tight">
                            <div className={cn("text-foreground", row.status === "new" ? "font-extrabold" : "font-bold")}>
                              {row.name ?? "—"}
                            </div>
                            <div className="text-[0.78rem] text-muted-foreground">{row.email ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      {inbox.headline ? (
                        <TableCell className="max-w-[260px] truncate text-[0.85rem]">
                          {formatFieldValue(inbox.headline, row.payload[inbox.headline])}
                        </TableCell>
                      ) : null}
                      {highlights.slice(0, 2).map((field) => (
                        <TableCell key={field} className="text-[0.85rem]">
                          {formatFieldValue(field, row.payload[field])}
                        </TableCell>
                      ))}
                      <TableCell>
                        <LocaleBadge locale={row.locale} />
                      </TableCell>
                      <TableCell>
                        {row.isSpam ? (
                          <span className="text-[0.78rem] font-semibold text-amber-800">
                            {SPAM_REASON[row.spamReason ?? ""] ?? row.spamReason ?? "Flagged"}
                          </span>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-[0.8rem] text-muted-foreground">{row.assignee?.name ?? "—"}</TableCell>
                      <TableCell className="pr-5 text-right text-[0.8rem] text-muted-foreground" title={formatDateTime(row.createdAt)}>
                        {formatRelative(row.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={8}>
                    {tab === "spam" ? "Nothing in quarantine." : "No submissions match these filters."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} submissions
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

      <SubmissionSheet
        id={selectedId}
        type={type}
        canEdit={canEdit}
        assignees={assignees}
        onClose={closeDetail}
        onChange={applyChange}
      />
    </div>
  );
}

function SubmissionSheet({
  id,
  type,
  canEdit,
  assignees,
  onClose,
  onChange,
}: {
  id: number | null;
  type: FormType;
  canEdit: boolean;
  assignees: Assignee[];
  onClose: () => void;
  onChange: (submission: Submission) => void;
}) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (id === null) {
      setSubmission(null);
      setError(null);
      setNote("");
      return;
    }
    let cancelled = false;
    setError(null);
    api
      .get<Submission>(`/api/form-submissions/${id}`)
      .then(({ data }) => {
        if (!cancelled) setSubmission(data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patch = async (payload: { status?: SubmissionStatus; assignedToId?: number | null }, success: string) => {
    if (!submission) return;
    setBusy(true);
    try {
      const { data } = await api.patch<Submission>(`/api/form-submissions/${submission.id}`, payload);
      const merged = { ...submission, ...data, notes: submission.notes };
      setSubmission(merged);
      onChange(merged);
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const releaseFromQuarantine = async () => {
    if (!submission) return;
    setBusy(true);
    try {
      const { data } = await api.post<Submission>(`/api/form-submissions/${submission.id}/not-spam`);
      const merged = { ...submission, ...data, notes: submission.notes };
      setSubmission(merged);
      onChange(merged);
      toast.success("Moved out of quarantine.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!submission || !note.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post<SubmissionNote>(`/api/form-submissions/${submission.id}/notes`, { body: note.trim() });
      setSubmission({ ...submission, notes: [...(submission.notes ?? []), data] });
      setNote("");
      toast.success("Note added.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const assigneeItems: Record<string, string> = {
    "0": "Unassigned",
    ...Object.fromEntries(assignees.map((a) => [String(a.id), a.name])),
  };
  const highlights = HIGHLIGHT_FIELDS[type] ?? [];
  const replySubject = encodeURIComponent(`Re: your message to Be Real Humanitarian Works`);

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {error ? (
          <div className="p-5">
            <SheetHeader className="p-0">
              <SheetTitle>Submission</SheetTitle>
              <SheetDescription className="text-brand-coral-700">{error}</SheetDescription>
            </SheetHeader>
          </div>
        ) : !submission ? (
          <div className="grid gap-3 p-5">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <SheetTitle className="text-lg font-bold text-brand-purple-950">{submission.name ?? submission.email ?? "Submission"}</SheetTitle>
                <LocaleBadge locale={submission.locale} />
                {submission.isSpam ? (
                  <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                    Quarantined
                  </Badge>
                ) : (
                  <StatusBadge status={submission.status} />
                )}
              </div>
              <SheetDescription>
                {INBOX[type].title} · #{submission.id} · received {formatDateTime(submission.createdAt)}
                {submission.sourcePage ? (
                  <>
                    {" · "}
                    <a href={submission.sourcePage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-purple-700 hover:underline">
                      source page
                      <ExternalLink className="size-3" />
                    </a>
                  </>
                ) : null}
              </SheetDescription>
              {submission.isSpam ? (
                <p className="mt-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8rem] font-semibold text-amber-900">
                  Held in quarantine: {SPAM_REASON[submission.spamReason ?? ""] ?? submission.spamReason ?? "flagged"}. No emails were sent.
                </p>
              ) : null}
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                {submission.email ? (
                  <Button variant="coral" size="sm" asChild>
                    <a href={`mailto:${submission.email}?subject=${replySubject}`}>
                      <Reply className="size-3.5" />
                      Reply by email
                    </a>
                  </Button>
                ) : null}
                {submission.isSpam && canEdit ? (
                  <Button variant="outline" size="sm" disabled={busy} onClick={releaseFromQuarantine}>
                    <ShieldCheck className="size-3.5" />
                    Not spam
                  </Button>
                ) : null}
              </div>

              {canEdit && !submission.isSpam ? (
                <div className="grid gap-3 rounded-[12px] bg-brand-purple-50 p-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label className="text-[0.74rem] font-bold text-muted-foreground uppercase tracking-wider">Status</Label>
                    <Select
                      value={submission.status}
                      onValueChange={(v) => v && v !== submission.status && patch({ status: v as SubmissionStatus }, `Marked as ${SUBMISSION_STATUS_LABEL[v as SubmissionStatus]}.`)}
                      items={STATUS_ITEMS}
                      disabled={busy}
                    >
                      <SelectTrigger className="min-h-9 w-full rounded-[8px] bg-white text-[0.8rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SUBMISSION_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[0.74rem] font-bold text-muted-foreground uppercase tracking-wider">Assigned to</Label>
                    <Select
                      value={String(submission.assignedToId ?? 0)}
                      onValueChange={(v) => {
                        const next = v && v !== "0" ? Number(v) : null;
                        if (next !== (submission.assignedToId ?? null)) {
                          patch({ assignedToId: next }, next ? `Assigned to ${assigneeItems[String(next)]}.` : "Unassigned.");
                        }
                      }}
                      items={assigneeItems}
                      disabled={busy}
                    >
                      <SelectTrigger className="min-h-9 w-full rounded-[8px] bg-white text-[0.8rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(assigneeItems).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {highlights.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {highlights.map((field) => (
                    <div key={field} className="rounded-[10px] border border-border bg-white px-3 py-2">
                      <div className="text-[0.66rem] font-bold text-muted-foreground uppercase tracking-wider">{FIELD_LABELS[field]}</div>
                      <div className="mt-0.5 text-[0.85rem] font-bold text-foreground">{formatFieldValue(field, submission.payload[field])}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <dl className="grid gap-3">
                {FORM_FIELDS[type]
                  .filter((field) => !highlights.includes(field))
                  .map((field) => (
                    <div key={field} className="grid gap-0.5">
                      <dt className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">{FIELD_LABELS[field] ?? field}</dt>
                      <dd
                        className={cn(
                          "text-[0.88rem] text-foreground",
                          LONG_FIELDS.has(field) && "rounded-[10px] border border-border bg-white px-3 py-2 whitespace-pre-wrap",
                        )}
                      >
                        {field === "email" && submission.payload.email ? (
                          <a href={`mailto:${String(submission.payload.email)}`} className="text-brand-purple-700 hover:underline">
                            {String(submission.payload.email)}
                          </a>
                        ) : (
                          formatFieldValue(field, submission.payload[field])
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>

              <section className="grid gap-3 border-t border-border pt-4">
                <h3 className="flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">
                  <NotebookPen className="size-4 text-brand-purple-600" />
                  Internal notes
                </h3>
                {submission.notes && submission.notes.length > 0 ? (
                  <ul className="grid gap-2">
                    {submission.notes.map((item) => (
                      <li key={item.id} className="rounded-[10px] bg-brand-purple-50 px-3 py-2">
                        <div className="text-[0.7rem] font-bold text-muted-foreground">
                          {item.author?.name ?? item.authorName ?? "Staff"} · {formatDateTime(item.createdAt)}
                        </div>
                        <p className="mt-0.5 text-[0.85rem] whitespace-pre-wrap text-foreground">{item.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">No notes yet.</p>
                )}
                {canEdit ? (
                  <div className="grid gap-2">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note for colleagues (never sent to the visitor)"
                      className="min-h-20 rounded-[10px] bg-white"
                      maxLength={4000}
                    />
                    <div className="flex justify-end">
                      <Button variant="purple" size="sm" disabled={busy || !note.trim()} onClick={addNote}>
                        Add note
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
