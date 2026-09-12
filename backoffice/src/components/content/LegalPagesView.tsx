"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, History, RotateCcw, Save, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleDots, LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { RichTextEditor } from "@/components/content/RichTextEditor";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { localizedFrom, previewUrl, siteUrl } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import type { LegalPage, Locale, Localized } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLUGS = [
  { slug: "privacy-policy", label: "Privacy Policy", path: "/privacy-policy" },
  { slug: "terms", label: "Terms & Website Disclaimer", path: "/terms" },
] as const;

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function LegalPagesView() {
  const [slug, setSlug] = useState<(typeof SLUGS)[number]["slug"]>("privacy-policy");
  if (isDemoMode) return <DemoNotice screen="Legal pages" />;
  const current = SLUGS.find((s) => s.slug === slug)!;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={slug} onValueChange={(v) => setSlug(v as typeof slug)}>
            <TabsList className="h-10 rounded-[10px]">
              {SLUGS.map((s) => (
                <TabsTrigger key={s.slug} value={s.slug} className="rounded-[8px] px-3">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-[0.78rem] text-muted-foreground">Until a first version is published, the site says the page is being prepared — no placeholder legal text goes live.</p>
        </div>
      </Card>
      <LegalEditor key={slug} slug={slug} path={current.path} />
    </div>
  );
}

function LegalEditor({ slug, path }: { slug: string; path: string }) {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [page, setPage] = useState<LegalPage | null>(null);
  const [title, setTitle] = useState<Localized>(localizedFrom(null));
  const [body, setBody] = useState<Localized>(localizedFrom(null));
  const [effectiveDate, setEffectiveDate] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<number | null>(null);

  const apply = useCallback((data: LegalPage) => {
    setPage(data);
    setTitle(localizedFrom(data.title));
    setBody(localizedFrom(data.body));
    setEffectiveDate(data.effectiveDate ?? "");
    setDirty(false);
  }, []);

  useEffect(() => {
    api
      .get<LegalPage>(`/api/legal-pages/${slug}`)
      .then(({ data }) => apply(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, [slug, apply]);

  const save = async (): Promise<LegalPage | null> => {
    setBusy(true);
    try {
      const { data } = await api.put<LegalPage>(`/api/legal-pages/${slug}`, { title, body, effectiveDate: effectiveDate || null });
      apply(data);
      toast.success("Draft saved.");
      return data;
    } catch (err) {
      toast.error(errorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    if (dirty && !(await save())) return;
    window.open(previewUrl(path), "_blank", "noopener");
  };

  const publish = async () => {
    setBusy(true);
    try {
      if (dirty) await api.put<LegalPage>(`/api/legal-pages/${slug}`, { title, body, effectiveDate: effectiveDate || null });
      const { data } = await api.post<LegalPage>(`/api/legal-pages/${slug}/publish`, {});
      apply(data);
      setConfirmPublish(false);
      toast.success(`Version ${data.version} is live.`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.errors?.length ? e.errors.map((x) => x.message).join(" ") : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (restoreId === null) return;
    setBusy(true);
    try {
      const { data } = await api.post<LegalPage>(`/api/legal-pages/${slug}/versions/${restoreId}/restore`, {});
      apply(data);
      setRestoreId(null);
      setHistoryOpen(false);
      toast.success("Version restored into the draft. Publish to make it live.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!page) return <Skeleton className="h-64 w-full rounded-[14px]" />;
  const disabled = !canEdit || busy;
  const unpublished = page.hasUnpublishedChanges || dirty;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={cn("rounded-[6px] font-bold", page.isPublished ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>
            {page.isPublished ? `Version ${page.version} live` : "Never published"}
          </Badge>
          {unpublished ? (
            <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
              Unpublished changes
            </Badge>
          ) : null}
          <span className="text-[0.78rem] text-muted-foreground">
            {page.publishedAt ? `Published ${formatDateTime(page.publishedAt)}` : ""}
            {page.publishedEffectiveDate ? ` · effective ${page.publishedEffectiveDate}` : ""}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={siteUrl(path)} target="_blank" rel="noopener noreferrer">
                View live
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="size-3.5" />
              History
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" size="sm" onClick={preview} disabled={busy}>
                  <Eye className="size-3.5" />
                  {dirty ? "Save & preview" : "Preview draft"}
                </Button>
                <Button variant="purple" size="sm" onClick={save} disabled={busy || !dirty}>
                  <Save className="size-3.5" />
                  Save draft
                </Button>
                <Button variant="coral" size="sm" onClick={() => setConfirmPublish(true)} disabled={busy || (!unpublished && page.isPublished)}>
                  <Send className="size-3.5" />
                  Publish {page.isPublished ? `v${page.version + 1}` : "v1"}
                </Button>
              </>
            ) : (
              <span className="rounded-[8px] bg-muted px-2.5 py-1 text-[0.74rem] font-bold text-muted-foreground">Read-only</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LocaleTabs value={locale} onChange={setLocale} values={[title, body]} />
          <div className="grid gap-1.5">
            <Label htmlFor={`${slug}-date`} className="text-[0.8rem] font-bold">
              Effective date
            </Label>
            <Input
              id={`${slug}-date`}
              type="date"
              value={effectiveDate}
              disabled={disabled}
              onChange={(e) => {
                setEffectiveDate(e.target.value);
                setDirty(true);
              }}
              className="min-h-10 rounded-[10px] bg-white"
            />
          </div>
        </div>
        <LocalizedInput
          label="Title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            setDirty(true);
          }}
          locale={locale}
          required
          disabled={disabled}
        />
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[0.8rem] font-bold">Text ({locale.toUpperCase()})</Label>
            <LocaleDots value={body} />
          </div>
          <RichTextEditor
            value={body[locale] ?? ""}
            onChange={(html) => {
              setBody((b) => ({ ...b, [locale]: html }));
              setDirty(true);
            }}
            disabled={disabled}
            minHeight={420}
            placeholder="Paste or write the legal text. Headings, lists and links are kept; styling is applied by the site."
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title={`Publish version ${page.version + 1}?`}
        description="The page goes live in every language that has text; languages without text fall back to English. The previous version is kept."
        cta="Publish"
        busy={busy}
        onConfirm={publish}
      />
      <ConfirmDialog open={restoreId !== null} onOpenChange={(o) => !o && setRestoreId(null)} title="Restore this version?" description="It replaces the current draft. Nothing changes on the site until you publish." cta="Restore into draft" busy={busy} onConfirm={restore} />

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-lg font-bold text-brand-purple-950">Version history</SheetTitle>
            <SheetDescription>Every published version, newest first.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4 pb-6">
            {page.versions.length === 0 ? <p className="text-[0.82rem] text-muted-foreground">Nothing published yet.</p> : null}
            {page.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[0.82rem] font-bold text-foreground">
                    Version {v.version}
                    {v.version === page.version ? <span className="ml-1.5 text-[0.66rem] font-extrabold text-emerald-700 uppercase">Live</span> : null}
                  </div>
                  <div className="truncate text-[0.72rem] text-muted-foreground">
                    {formatDateTime(v.createdAt)} · {v.createdBy?.name ?? "—"}
                    {v.effectiveDate ? ` · effective ${v.effectiveDate}` : ""}
                  </div>
                </div>
                {canEdit ? (
                  <Button variant="outline" size="sm" onClick={() => setRestoreId(v.id)} disabled={busy}>
                    <RotateCcw className="size-3.5" />
                    Restore
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
