"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, History, Lock, RotateCcw, Save, Send, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { MediaField } from "@/components/content/MediaPicker";
import { PageStatusBadge } from "@/components/content/PagesListView";
import { SortControls, moveItem } from "@/components/content/SortControls";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { LOCALES, LOCALE_SHORT, SITE_URL, previewUrl, siteUrl } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import type { Locale, Media, PageContent, PageDetail, PageSectionSchema } from "@/lib/types";
import { cn } from "@/lib/utils";

// Keys another screen owns (mirrors backend/config/pageSchema.js RESERVED_PREFIXES).
const RESERVED = ["Programs.items.", "ProgramsPage.programs.", "About.leadership.roles.", "ImpactPage.metrics.items.", "Brand.legalName", "Brand.tagline", "Brand.statusLine", "Footer.political"];

type Defaults = Record<Locale, Record<string, string>>;

function flatten(obj: unknown, prefix = "", out: Record<string, string> = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof obj === "string") {
    out[prefix] = obj;
  }
  return out;
}

const matches = (prefix: string, key: string) => (prefix.endsWith(".") ? key.startsWith(prefix) : key === prefix);
const isReserved = (key: string) => RESERVED.some((p) => matches(p, key));
const sectionKeys = (section: PageSectionSchema, allKeys: string[]) =>
  allKeys.filter((key) => !isReserved(key) && (section.messageKeys ?? []).some((p) => matches(p, key)));

function humanize(key: string) {
  const last = key.split(".").pop() ?? key;
  return last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function PageEditorView({ slug }: { slug: string }) {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [page, setPage] = useState<PageDetail | null>(null);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [defaultsError, setDefaultsError] = useState(false);
  const [draft, setDraft] = useState<PageContent | null>(null);
  const [images, setImages] = useState<Record<string, Media>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "discard" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<number | null>(null);

  const apply = useCallback((detail: PageDetail) => {
    setPage(detail);
    setDraft(detail.draft);
    setImages(detail.draftImages);
    setDirty(false);
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<PageDetail>(`/api/pages/${slug}`)
      .then(({ data }) => apply(data))
      .catch((err) => setLoadError(errorMessage(err)));
    Promise.all(
      LOCALES.map((locale) =>
        fetch(`${SITE_URL}/api/messages/${locale}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((body: { messages: unknown }) => [locale, flatten(body.messages)] as const),
      ),
    )
      .then((entries) => setDefaults(Object.fromEntries(entries) as Defaults))
      .catch(() => setDefaultsError(true));
  }, [slug, apply]);

  const allKeys = useMemo(() => (defaults ? Object.keys(defaults.en) : []), [defaults]);

  const setMessage = (locale: Locale, key: string, value: string) => {
    setDraft((d) => {
      if (!d) return d;
      const forLocale = { ...(d.messages[locale] ?? {}) };
      if (value === "") delete forLocale[key];
      else forLocale[key] = value;
      return { ...d, messages: { ...d.messages, [locale]: forLocale } };
    });
    setDirty(true);
  };

  const setImage = (slot: string, media: Media | null) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d.images };
      if (media) next[slot] = media.id;
      else delete next[slot];
      return { ...d, images: next };
    });
    setImages((imgs) => {
      const next = { ...imgs };
      if (media) next[slot] = media;
      else delete next[slot];
      return next;
    });
    setDirty(true);
  };

  const setSections = (sections: PageContent["sections"]) => {
    setDraft((d) => (d ? { ...d, sections } : d));
    setDirty(true);
  };

  const saveDraft = async (): Promise<PageDetail | null> => {
    if (!draft) return null;
    setBusy(true);
    try {
      const { data } = await api.put<PageDetail>(`/api/pages/${slug}/draft`, draft);
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
    if (!page?.path) return;
    if (dirty) {
      const saved = await saveDraft();
      if (!saved) return;
    }
    window.open(previewUrl(page.path), "_blank", "noopener");
  };

  const publish = async () => {
    setBusy(true);
    try {
      if (dirty) await api.put<PageDetail>(`/api/pages/${slug}/draft`, draft);
      const { data } = await api.post<PageDetail>(`/api/pages/${slug}/publish`, {});
      apply(data);
      setConfirm(null);
      toast.success("Published. The website updates within a minute.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<PageDetail>(`/api/pages/${slug}/discard`, {});
      apply(data);
      setConfirm(null);
      toast.success("Draft changes discarded.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (restoreId === null) return;
    setBusy(true);
    try {
      const { data } = await api.post<PageDetail>(`/api/pages/${slug}/versions/${restoreId}/restore`, {});
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

  if (isDemoMode) return <DemoNotice screen="Pages" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!page || !draft) return <Skeleton className="h-64 w-full rounded-[14px]" />;

  const schema = page.schema;
  const disabled = !canEdit || busy;
  const orderedSections = draft.sections.map((entry) => ({ entry, def: schema.sections.find((s) => s.key === entry.key) })).filter((x): x is { entry: PageContent["sections"][number]; def: PageSectionSchema } => Boolean(x.def));
  const seoSections = schema.sections.filter((s) => s.seo);
  const overrideCount = LOCALES.reduce((n, l) => n + Object.keys(draft.messages[l] ?? {}).length, 0);

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/content/pages">
              <ArrowLeft className="size-4" />
              All pages
            </Link>
          </Button>
          <PageStatusBadge page={{ hasUnpublishedChanges: page.hasUnpublishedChanges || dirty, publishedAt: page.publishedAt }} />
          <span className="text-[0.78rem] text-muted-foreground">
            {overrideCount} edited field{overrideCount === 1 ? "" : "s"}
            {page.publishedAt ? ` · last published ${formatDateTime(page.publishedAt)}` : ""}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {page.path ? (
              <Button variant="outline" size="sm" asChild>
                <a href={siteUrl(page.path)} target="_blank" rel="noopener noreferrer">
                  View live
                </a>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="size-3.5" />
              History
            </Button>
            {canEdit ? (
              <>
                {page.path ? (
                  <Button variant="outline" size="sm" onClick={preview} disabled={busy}>
                    <Eye className="size-3.5" />
                    {dirty ? "Save & preview" : "Preview draft"}
                  </Button>
                ) : null}
                {page.hasUnpublishedChanges || dirty ? (
                  <Button variant="ghost" size="sm" onClick={() => setConfirm("discard")} disabled={busy}>
                    <Trash2 className="size-3.5" />
                    Discard
                  </Button>
                ) : null}
                <Button variant="purple" size="sm" onClick={saveDraft} disabled={busy || !dirty}>
                  <Save className="size-3.5" />
                  Save draft
                </Button>
                <Button variant="coral" size="sm" onClick={() => setConfirm("publish")} disabled={busy || (!dirty && !page.hasUnpublishedChanges)}>
                  <Send className="size-3.5" />
                  Publish
                </Button>
              </>
            ) : (
              <span className="rounded-[8px] bg-muted px-2.5 py-1 text-[0.74rem] font-bold text-muted-foreground">Read-only</span>
            )}
          </div>
        </div>
        {defaultsError ? (
          <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8rem] font-semibold text-amber-900">
            The website ({SITE_URL}) did not answer, so the built-in text cannot be shown next to each field. You can still edit; placeholders will be empty.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="gap-2 rounded-[14px] border border-border px-4 ring-0 shadow-none">
            <h2 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Sections</h2>
            <p className="text-[0.74rem] text-muted-foreground">Order and visibility on the page.</p>
            <ul className="grid gap-1">
              {orderedSections.map(({ entry, def }, index) => (
                <li key={entry.key} className={cn("flex items-center gap-1 rounded-[10px] border border-border bg-white px-1.5 py-1", !entry.visible && "opacity-60")}>
                  {def.locked ? (
                    <span className="flex w-8 items-center justify-center text-muted-foreground" title="Always first">
                      <Lock className="size-3.5" />
                    </span>
                  ) : (
                    <SortControls
                      index={index}
                      count={orderedSections.length}
                      disabled={disabled}
                      onMove={(from, to) => {
                        if (to < 1 && orderedSections[0].def.locked) return;
                        setSections(moveItem(draft.sections, from, to));
                      }}
                    />
                  )}
                  <a href={`#section-${entry.key}`} className="min-w-0 flex-1 truncate text-[0.8rem] font-bold text-foreground hover:text-brand-purple-700">
                    {def.title}
                  </a>
                  <Checkbox
                    checked={entry.visible}
                    disabled={disabled || def.locked}
                    onCheckedChange={(c) => setSections(draft.sections.map((s) => (s.key === entry.key ? { ...s, visible: c === true } : s)))}
                    aria-label={`${def.title} visible`}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="grid gap-4">
          {[...orderedSections.map((x) => x.def), ...seoSections].map((section) => {
            const keys = defaults ? sectionKeys(section, allKeys) : [];
            const entry = draft.sections.find((s) => s.key === section.key);
            return (
              <Card key={section.key} id={`section-${section.key}`} className={cn("gap-4 scroll-mt-20 rounded-[14px] border border-border px-5 ring-0 shadow-none", entry && !entry.visible && "border-dashed opacity-70")}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[0.95rem] font-bold text-brand-purple-950">{section.title}</h2>
                  {entry && !entry.visible ? (
                    <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                      Hidden on the page
                    </Badge>
                  ) : null}
                  {section.seo ? (
                    <Badge variant="outline" className="rounded-[6px] bg-white font-bold">
                      Search & social
                    </Badge>
                  ) : null}
                </div>
                {section.description ? <p className="-mt-2 text-[0.8rem] text-muted-foreground">{section.description}</p> : null}

                {section.shared ? (
                  <p className="text-[0.82rem]">
                    Text and photo of this band are edited once for the whole site:{" "}
                    <Link href="/content/pages/global" className="font-bold text-brand-purple-700 hover:underline">
                      open Global
                    </Link>
                    .
                  </p>
                ) : null}

                {(section.images ?? []).length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.images!.map((slot) => (
                      <MediaField key={slot.slot} label={slot.label} value={images[slot.slot] ?? null} onChange={(m) => setImage(slot.slot, m)} defaultSrc={`${SITE_URL}${slot.default}`} disabled={disabled} />
                    ))}
                  </div>
                ) : null}

                {keys.length > 0 ? (
                  <div className="grid gap-3">
                    {keys.map((key) => (
                      <FieldRow key={key} fieldKey={key} defaults={defaults!} draft={draft} disabled={disabled} onChange={setMessage} />
                    ))}
                  </div>
                ) : !section.shared && (section.messageKeys ?? []).length > 0 && defaults ? (
                  <p className="text-[0.8rem] text-muted-foreground">No editable text in this section.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Publish this page?"
        description="Every visitor sees the new text and photos within a minute. A version is kept so you can go back."
        cta="Publish"
        busy={busy}
        onConfirm={publish}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Discard draft changes?"
        description="The draft goes back to what is currently published."
        cta="Discard changes"
        destructive
        busy={busy}
        onConfirm={discard}
      />
      <ConfirmDialog
        open={restoreId !== null}
        onOpenChange={(o) => !o && setRestoreId(null)}
        title="Restore this version?"
        description="It replaces the current draft. Nothing changes on the site until you publish."
        cta="Restore into draft"
        busy={busy}
        onConfirm={restore}
      />

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-lg font-bold text-brand-purple-950">Version history</SheetTitle>
            <SheetDescription>One version per publish. Restoring puts it in the draft.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4 pb-6">
            {page.versions.length === 0 ? <p className="text-[0.82rem] text-muted-foreground">Nothing published yet.</p> : null}
            {page.versions.map((v, index) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[0.82rem] font-bold text-foreground">
                    {formatDateTime(v.createdAt)}
                    {index === 0 ? <span className="ml-1.5 text-[0.66rem] font-extrabold text-emerald-700 uppercase">Live</span> : null}
                  </div>
                  <div className="truncate text-[0.72rem] text-muted-foreground">
                    {v.createdBy?.name ?? "—"}
                    {v.note ? ` · ${v.note}` : ""}
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

function FieldRow({
  fieldKey,
  defaults,
  draft,
  disabled,
  onChange,
}: {
  fieldKey: string;
  defaults: Defaults;
  draft: PageContent;
  disabled: boolean;
  onChange: (locale: Locale, key: string, value: string) => void;
}) {
  const long = (defaults.en[fieldKey] ?? "").length > 70;
  return (
    <div className="grid gap-1.5 rounded-[12px] border border-border bg-brand-purple-50/40 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[0.82rem] font-bold text-foreground">{humanize(fieldKey)}</span>
        <span className="font-mono text-[0.66rem] text-muted-foreground">{fieldKey}</span>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        {LOCALES.map((locale) => {
          const value = draft.messages[locale]?.[fieldKey] ?? "";
          const fallback = defaults[locale]?.[fieldKey] ?? "";
          return (
            <div key={locale} className="relative">
              <span className={cn("pointer-events-none absolute top-1.5 right-2 z-10 rounded-[4px] px-1 text-[0.6rem] font-extrabold leading-4", value ? "bg-brand-coral-500 text-white" : "bg-muted text-muted-foreground")}>
                {LOCALE_SHORT[locale]}
              </span>
              <Textarea
                value={value}
                placeholder={fallback}
                disabled={disabled}
                onChange={(e) => onChange(locale, fieldKey, e.target.value)}
                rows={long ? 3 : 1}
                className={cn("min-h-9 rounded-[8px] bg-white pr-9 text-[0.82rem] md:text-[0.82rem]", value && "border-brand-coral-100")}
                aria-label={`${humanize(fieldKey)} (${LOCALE_SHORT[locale]})`}
              />
              {value ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(locale, fieldKey, "")}
                  className="absolute right-2 bottom-1.5 flex size-5 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Back to the built-in text"
                  aria-label="Reset to default"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
