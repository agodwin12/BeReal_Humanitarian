"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BadgeCheck, Download, RefreshCw, Search, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, apiDownload, apiUpload, isDemoMode, toQuery } from "@/lib/api";
import { LOCALE_NAME, stripHtml } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import type { ImportReport, TargetLocale, TranslationCounts, TranslationField, TranslationStatus, TranslationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TranslationStatus, string> = { missing: "Missing", needs_review: "Needs review", reviewed: "Reviewed" };
const STATUS_CLASS: Record<TranslationStatus, string> = {
  missing: "border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700",
  needs_review: "border-amber-200 bg-amber-50 text-amber-800",
  reviewed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const STATUS_ITEMS = { all: "All statuses", missing: "Missing", needs_review: "Needs review", reviewed: "Reviewed" };
const PAGE_SIZE = 40;

const ENTITY_SCREEN: Record<string, string> = { program: "/content/programs", team: "/content/team", metric: "/content/impact", story: "/content/impact", update: "/content/impact", legal: "/content/legal", settings: "/settings/site" };

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function Progress({ counts }: { counts: TranslationCounts }) {
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className="bg-emerald-500" style={{ width: `${pct(counts.reviewed)}%` }} />
      <div className="bg-amber-400" style={{ width: `${pct(counts.needs_review)}%` }} />
      <div className="bg-brand-coral-500" style={{ width: `${pct(counts.missing)}%` }} />
    </div>
  );
}

export function TranslationsView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [locale, setLocale] = useState<TargetLocale>("fr");
  const [page, setPage] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [fields, setFields] = useState<TranslationField[]>([]);
  const [summary, setSummary] = useState<TranslationSummary | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<{ fields: TranslationField[]; summary: TranslationSummary; source: string }>(`/api/translations${toQuery({ locale, page: page === "all" ? "" : page, status: status === "all" ? "" : status, q })}`);
      setFields(data.fields);
      setSummary(data.summary);
      setSource(data.source);
      setShown(PAGE_SIZE);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [locale, page, status, q]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  const replaceField = (next: TranslationField) => setFields((list) => list.map((f) => (f.id === next.id ? next : f)));

  const pageItems = useMemo(() => {
    const items: Record<string, string> = { all: "All pages" };
    for (const [slug, info] of Object.entries(summary?.pages ?? {})) items[slug] = info.title;
    return items;
  }, [summary]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await apiDownload(`/api/translations/export${toQuery({ locale, page: page === "all" ? "" : page, status: status === "all" ? "" : status })}`);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Translations" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  const counts = summary?.locales[locale];

  return (
    <div className="grid gap-4">
      <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={locale} onValueChange={(v) => setLocale(v as TargetLocale)}>
            <TabsList className="h-10 rounded-[10px]">
              {(["fr", "es"] as TargetLocale[]).map((l) => (
                <TabsTrigger key={l} value={l} className="rounded-[8px] px-3">
                  {LOCALE_NAME[l]}
                  {summary ? (
                    <span className="text-[0.66rem] text-muted-foreground">
                      {summary.locales[l].reviewed}/{summary.locales[l].total}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
              <Download className="size-3.5" />
              {exporting ? "Exporting…" : "Export worksheet"}
            </Button>
            {canEdit ? (
              <Button variant="coral" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="size-3.5" />
                Import worksheet
              </Button>
            ) : null}
          </div>
        </div>

        {counts ? (
          <div className="grid gap-2">
            <Progress counts={counts} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem]">
              <span className="font-bold text-emerald-700">{counts.reviewed} reviewed</span>
              <span className="font-bold text-amber-800">{counts.needs_review} need review</span>
              <span className="font-bold text-brand-coral-700">{counts.missing} missing</span>
              <span className="text-muted-foreground">{counts.total} fields in {LOCALE_NAME[locale]}</span>
              {source === "snapshot" ? <span className="text-amber-800">Built-in copy read from the API snapshot — the website is unreachable.</span> : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text, field or section" className="min-h-10 rounded-[10px] bg-white pl-9" />
          </div>
          <Select value={page} onValueChange={(v) => setPage(v ?? "all")} items={pageItems}>
            <SelectTrigger className="min-h-10 w-[220px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(pageItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_ITEMS}>
            <SelectTrigger className="min-h-10 w-[170px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="grid gap-3">
          {loading && fields.length === 0 ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-[14px]" />)
          ) : fields.length === 0 ? (
            <Card className="rounded-[14px] border border-border px-5 py-8 text-center text-sm text-muted-foreground ring-0 shadow-none">No fields match these filters.</Card>
          ) : (
            <>
              {fields.slice(0, shown).map((field) => (
                <FieldCard key={field.id} field={field} locale={locale} canEdit={canEdit} onChange={replaceField} />
              ))}
              {shown < fields.length ? (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                    Show more ({fields.length - shown} left)
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Card className="gap-3 rounded-[14px] border border-border px-4 ring-0 shadow-none">
            <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">{LOCALE_NAME[locale]} launch checklist</h2>
            <p className="text-[0.74rem] text-muted-foreground">A page is ready when every field is reviewed by a native speaker. Hide a language in Site settings until then.</p>
            <ul className="grid gap-2">
              {Object.entries(summary?.pages ?? {}).map(([slug, info]) => {
                const c = info[locale];
                const ready = c.total > 0 && c.reviewed === c.total;
                return (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => setPage(slug)}
                      className={cn("grid w-full gap-1 rounded-[10px] border border-border bg-white px-3 py-2 text-left hover:bg-brand-purple-50", page === slug && "border-brand-purple-300")}
                    >
                      <span className="flex items-center justify-between text-[0.8rem] font-bold text-foreground">
                        {info.title}
                        {ready ? <BadgeCheck className="size-4 text-emerald-600" /> : <span className="text-[0.7rem] text-muted-foreground">{c.reviewed}/{c.total}</span>}
                      </span>
                      <Progress counts={c} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
    </div>
  );
}

function FieldCard({ field, locale, canEdit, onChange }: { field: TranslationField; locale: TargetLocale; canEdit: boolean; onChange: (f: TranslationField) => void }) {
  const state = field[locale];
  const [text, setText] = useState(state.text);
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(state.text), [state.text, field.id, locale]);
  const dirty = text !== state.text;
  const editable = canEdit && !field.rich;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put<TranslationField>(`/api/translations/${encodeURIComponent(field.id)}`, { locale, text });
      onChange(data);
      toast.success("Saved — live on the site.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const review = async (reviewed: boolean) => {
    setBusy(true);
    try {
      const { data } = await api.post<TranslationField>(`/api/translations/${encodeURIComponent(field.id)}/review`, { locale, reviewed });
      onChange(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn("gap-3 rounded-[14px] border border-border px-4 py-3 ring-0 shadow-none", state.status === "missing" && "border-brand-coral-100")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.85rem] font-bold text-foreground">{field.label}</span>
        <span className="text-[0.74rem] text-muted-foreground">
          {field.pageTitle} · {field.section}
        </span>
        <Badge variant="outline" className={cn("rounded-[6px] font-bold", STATUS_CLASS[state.status])}>
          {STATUS_LABEL[state.status]}
        </Badge>
        {state.origin === "edited" && field.kind === "message" ? (
          <Badge variant="outline" className="rounded-[6px] bg-white font-bold">
            Edited
          </Badge>
        ) : null}
        {state.staleReview ? <span className="text-[0.72rem] font-bold text-amber-800">Text changed since the last review</span> : null}
        {field.key ? <span className="ml-auto font-mono text-[0.64rem] text-muted-foreground">{field.key}</span> : null}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-[10px] bg-muted/60 px-3 py-2 text-[0.82rem] whitespace-pre-wrap text-foreground">
          <span className="mb-1 block text-[0.62rem] font-extrabold tracking-wider text-muted-foreground uppercase">English</span>
          {field.rich ? stripHtml(field.en) : field.en || <em className="text-muted-foreground">empty</em>}
        </div>
        <div className="grid gap-1.5">
          <span className="block text-[0.62rem] font-extrabold tracking-wider text-muted-foreground uppercase">{LOCALE_NAME[locale]}</span>
          {field.rich ? (
            <div className="rounded-[10px] border border-border bg-white px-3 py-2 text-[0.82rem] whitespace-pre-wrap">
              {stripHtml(state.text) || <em className="text-muted-foreground">empty</em>}
              <div className="mt-1 text-[0.72rem] text-muted-foreground">
                Rich text —{" "}
                <Link href={ENTITY_SCREEN[field.kind] ?? "/content/pages"} className="font-bold text-brand-purple-700 hover:underline">
                  edit on its screen
                </Link>
                .
              </div>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!editable || busy}
              rows={field.multiline ? 4 : 1}
              placeholder={`${LOCALE_NAME[locale]} text`}
              className="min-h-9 rounded-[10px] bg-white text-[0.82rem] md:text-[0.82rem]"
            />
          )}
          {field.note ? <p className="text-[0.7rem] text-muted-foreground">{field.note}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[0.78rem] font-bold">
          <Checkbox checked={state.status === "reviewed"} disabled={!canEdit || busy || state.status === "missing" || dirty} onCheckedChange={(c) => review(c === true)} />
          Reviewed by a native speaker
          {state.reviewedBy ? <span className="font-normal text-muted-foreground">· {state.reviewedBy}, {formatDateTime(state.reviewedAt)}</span> : null}
        </label>
        {editable ? (
          <div className="ml-auto flex gap-2">
            {dirty ? (
              <Button variant="ghost" size="sm" onClick={() => setText(state.text)} disabled={busy}>
                Undo
              </Button>
            ) : null}
            <Button variant="purple" size="sm" onClick={save} disabled={!dirty || busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setReport(null);
      setError(null);
    }
  }, [open]);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiUpload<ImportReport>("/api/translations/import", form);
      setReport(data);
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Import a translator worksheet</DialogTitle>
          <DialogDescription>A CSV exported from here, with the “fr” and/or “es” column filled in. Only changed cells are applied; they go live at once.</DialogDescription>
        </DialogHeader>
        {report ? (
          <div className="grid gap-2 text-[0.85rem]">
            <p>
              <strong>{report.applied}</strong> field{report.applied === 1 ? "" : "s"} updated · {report.unchanged} unchanged · {report.unknown} unknown id{report.unknown === 1 ? "" : "s"}
            </p>
            {report.errors.length ? (
              <ul className="max-h-40 overflow-auto rounded-[10px] bg-brand-coral-50 p-3 text-[0.76rem] text-brand-coral-700">
                {report.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="min-h-10 rounded-[10px] bg-white" />
            {error ? (
              <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          {report ? (
            <Button variant="purple" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={run} disabled={busy || !file}>
                {busy ? "Importing…" : "Import"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
