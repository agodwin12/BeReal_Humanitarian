"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleDots, LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { MediaField, mediaThumb } from "@/components/content/MediaPicker";
import { RichTextEditor } from "@/components/content/RichTextEditor";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { METRIC_ICONS, emptyLocalized, localizedFrom, stripHtml } from "@/lib/content";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ImpactMetric, ImpactOverview, ImpactStory, Locale, Localized, Media, StewardshipUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_ITEMS = Object.fromEntries(METRIC_ICONS.map((i) => [i, i]));

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <Badge variant="outline" className={cn("rounded-[6px] font-bold", published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>
      {published ? "Published" : "Draft"}
    </Badge>
  );
}

export function ImpactView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [tab, setTab] = useState<"metrics" | "stories" | "updates">("metrics");
  const [data, setData] = useState<ImpactOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<ImpactOverview>("/api/impact")
      .then(({ data }) => setData(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  if (isDemoMode) return <DemoNotice screen="Impact" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="h-10 rounded-[10px]">
              <TabsTrigger value="metrics" className="rounded-[8px] px-3">
                Metrics {data ? <span className="text-[0.66rem] text-muted-foreground">{data.metrics.filter((m) => m.published).length}/{data.metrics.length} live</span> : null}
              </TabsTrigger>
              <TabsTrigger value="stories" className="rounded-[8px] px-3">
                Stories {data ? <span className="text-[0.66rem] text-muted-foreground">{data.stories.length}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="updates" className="rounded-[8px] px-3">
                Stewardship updates {data ? <span className="text-[0.66rem] text-muted-foreground">{data.updates.length}</span> : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-[0.78rem] text-muted-foreground">
            {tab === "metrics"
              ? "A number goes live only with a documented-on date; until then the site shows “Reporting begins…”."
              : tab === "stories"
                ? "A story can be published only after the person's consent is confirmed."
                : "Dated notes on how gifts and resources were used."}
          </p>
        </div>
      </Card>

      {!data ? (
        <Skeleton className="h-48 w-full rounded-[14px]" />
      ) : tab === "metrics" ? (
        <MetricsPanel metrics={data.metrics} canEdit={canEdit} onChange={(m) => setData({ ...data, metrics: data.metrics.map((x) => (x.id === m.id ? m : x)) })} />
      ) : tab === "stories" ? (
        <StoriesPanel stories={data.stories} canEdit={canEdit} onChange={(stories) => setData({ ...data, stories })} />
      ) : (
        <UpdatesPanel updates={data.updates} canEdit={canEdit} onChange={(updates) => setData({ ...data, updates })} />
      )}
    </div>
  );
}

// ---- Metrics ------------------------------------------------------------------

function MetricsPanel({ metrics, canEdit, onChange }: { metrics: ImpactMetric[]; canEdit: boolean; onChange: (m: ImpactMetric) => void }) {
  const [editing, setEditing] = useState<ImpactMetric | null>(null);

  return (
    <Card className="gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Metric</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Documented on</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-5 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map((metric) => (
            <TableRow key={metric.id}>
              <TableCell className="pl-5">
                <div className="font-bold text-foreground">{metric.label.en}</div>
                <div className="flex items-center gap-2 text-[0.74rem] text-muted-foreground">
                  {metric.key} <LocaleDots value={metric.label} />
                </div>
              </TableCell>
              <TableCell className="text-lg font-bold text-brand-purple-950 tabular-nums">{metric.value ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-[0.82rem] text-muted-foreground">{metric.documentedOn ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge published={metric.published} />
              </TableCell>
              <TableCell className="pr-5">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(metric)}>
                    <Pencil className="size-3.5" />
                    {canEdit ? "Edit" : "View"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <MetricSheet
        metric={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(m) => {
          onChange(m);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function MetricSheet({ metric, canEdit, onClose, onSaved }: { metric: ImpactMetric | null; canEdit: boolean; onClose: () => void; onSaved: (m: ImpactMetric) => void }) {
  const [label, setLabel] = useState<Localized>(emptyLocalized());
  const [icon, setIcon] = useState("users");
  const [value, setValue] = useState("");
  const [documentedOn, setDocumentedOn] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [published, setPublished] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metric) return;
    setLabel(localizedFrom(metric.label));
    setIcon(metric.icon);
    setValue(metric.value ?? "");
    setDocumentedOn(metric.documentedOn ?? "");
    setSourceNote(metric.sourceNote ?? "");
    setPublished(metric.published);
    setError(null);
  }, [metric]);

  if (!metric) return <Sheet open={false} />;
  const disabled = !canEdit || busy;

  const save = async () => {
    if (published && (!value.trim() || !documentedOn)) return setError("To publish, enter the value and the date it was documented.");
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.patch<ImpactMetric>(`/api/impact/metrics/${metric.id}`, {
        label,
        icon,
        value: value.trim() || null,
        documentedOn: documentedOn || null,
        sourceNote: sourceNote.trim() || null,
        published,
      });
      toast.success(data.published ? `${data.label.en} is live on the Impact page.` : `${data.label.en} saved (not published).`);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{metric.label.en}</SheetTitle>
          <SheetDescription>Real, documented figures only (brief §8). Leave the value empty until one exists.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6">
          <LocaleTabs value={locale} onChange={setLocale} values={[label]} />
          <LocalizedInput label="Label" value={label} onChange={setLabel} locale={locale} disabled={disabled} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="metric-value" className="text-[0.8rem] font-bold">
                Value
              </Label>
              <Input id="metric-value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 120 or $4,300" disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="metric-date" className="text-[0.8rem] font-bold">
                Documented on
              </Label>
              <Input id="metric-date" type="date" value={documentedOn} onChange={(e) => setDocumentedOn(e.target.value)} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[0.8rem] font-bold">Icon</Label>
              <Select value={icon} onValueChange={(v) => v && setIcon(v)} items={ICON_ITEMS} disabled={disabled}>
                <SelectTrigger className="min-h-10 w-full rounded-[10px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_ICONS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="metric-source" className="text-[0.8rem] font-bold">
              Source note (internal)
            </Label>
            <Textarea id="metric-source" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="Where this number comes from — outreach log, receipts, volunteer sheets…" disabled={disabled} className="min-h-20 rounded-[10px] bg-white" />
          </div>
          <label className="flex items-start gap-2 text-[0.85rem] font-bold">
            <Checkbox checked={published} onCheckedChange={(c) => setPublished(c === true)} disabled={disabled} className="mt-0.5" />
            <span>
              Publish this value on the site
              <span className="block text-[0.74rem] font-normal text-muted-foreground">Requires a value and a documented-on date. Unpublished metrics keep the “Reporting begins…” placeholder.</span>
            </span>
          </label>
          {error ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {error}
            </p>
          ) : null}
          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save metric"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Stories ------------------------------------------------------------------

function StoriesPanel({ stories, canEdit, onChange }: { stories: ImpactStory[]; canEdit: boolean; onChange: (s: ImpactStory[]) => void }) {
  const [editing, setEditing] = useState<ImpactStory | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ImpactStory | null>(null);
  const [busy, setBusy] = useState(false);

  const upsert = (saved: ImpactStory) => onChange(stories.some((s) => s.id === saved.id) ? stories.map((s) => (s.id === saved.id ? saved : s)) : [...stories, saved]);

  const togglePublish = async (story: ImpactStory) => {
    try {
      const { data } = await api.post<ImpactStory>(`/api/impact/stories/${story.id}/${story.status === "published" ? "unpublish" : "publish"}`);
      upsert(data);
      toast.success(data.status === "published" ? "Story published." : "Story unpublished.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/impact/stories/${confirmDelete.id}`);
      onChange(stories.filter((s) => s.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success("Story deleted.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {canEdit ? (
        <div>
          <Button variant="coral" size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            New story
          </Button>
        </div>
      ) : null}
      {stories.length === 0 ? (
        <Card className="rounded-[14px] border border-border px-5 py-8 text-center text-sm text-muted-foreground ring-0 shadow-none">No stories yet. The Impact page shows this section only once a story is published.</Card>
      ) : null}
      {stories.map((story) => {
        const thumb = story.media ? mediaThumb(story.media) : null;
        return (
          <Card key={story.id} className="flex-row items-center gap-4 rounded-[14px] border border-border px-4 py-3 ring-0 shadow-none">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-foreground">{story.title.en || `Story #${story.id}`}</span>
                <LocaleDots value={story.title} />
                <StatusBadge published={story.status === "published"} />
                {story.consentConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-emerald-700">
                    <BadgeCheck className="size-3.5" /> Consent by {story.consentConfirmedBy}
                  </span>
                ) : (
                  <span className="text-[0.72rem] font-bold text-amber-800">Consent not confirmed</span>
                )}
              </div>
              <div className="truncate text-[0.78rem] text-muted-foreground">{stripHtml(story.body.en ?? "").slice(0, 140) || "No text yet"} · updated {formatRelative(story.updatedAt)}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {canEdit ? (
                <Button variant="outline" size="sm" disabled={!story.consentConfirmed && story.status !== "published"} onClick={() => togglePublish(story)}>
                  {story.status === "published" ? "Unpublish" : "Publish"}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setEditing(story)}>
                <Pencil className="size-3.5" />
                {canEdit ? "Edit" : "View"}
              </Button>
              {canEdit ? (
                <Button variant="ghost" size="sm" className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setConfirmDelete(story)}>
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </Card>
        );
      })}
      <StorySheet
        story={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          upsert(saved);
          setEditing(null);
        }}
      />
      <ConfirmDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Delete this story?" description="It is removed from the site immediately." cta="Delete" destructive busy={busy} onConfirm={remove} />
    </div>
  );
}

function StorySheet({ story, canEdit, onClose, onSaved }: { story: ImpactStory | "new" | null; canEdit: boolean; onClose: () => void; onSaved: (s: ImpactStory) => void }) {
  const [title, setTitle] = useState<Localized>(emptyLocalized());
  const [body, setBody] = useState<Localized>(emptyLocalized());
  const [media, setMedia] = useState<Media | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentBy, setConsentBy] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!story) return;
    const s = story === "new" ? null : story;
    setTitle(localizedFrom(s?.title));
    setBody(localizedFrom(s?.body));
    setMedia(s?.media ?? null);
    setConsent(s?.consentConfirmed ?? false);
    setConsentBy(s?.consentConfirmedBy ?? "");
    setError(null);
    setLocale("en");
  }, [story]);

  if (!story) return <Sheet open={false} />;
  const isNew = story === "new";
  const disabled = !canEdit || busy;

  const save = async () => {
    if (!title.en?.trim()) return setError("The English title is required.");
    if (consent && !consentBy.trim() && !(story !== "new" && story.consentConfirmed)) return setError("Say who confirmed the consent.");
    setBusy(true);
    setError(null);
    const payload = { title, body, mediaId: media?.id ?? null, consentConfirmed: consent, consentConfirmedBy: consentBy.trim() || null };
    try {
      const { data } = isNew ? await api.post<ImpactStory>("/api/impact/stories", payload) : await api.patch<ImpactStory>(`/api/impact/stories/${story.id}`, payload);
      toast.success("Story saved.");
      onSaved(data);
    } catch (err) {
      const e = err as ApiError;
      setError(e.errors?.length ? e.errors.map((x) => x.message).join(" ") : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{isNew ? "New story" : title.en || "Story"}</SheetTitle>
          <SheetDescription>Only real moments, only with the permission of the people involved. No names or details that could identify someone without their consent.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6">
          <LocaleTabs value={locale} onChange={setLocale} values={[title, body]} />
          <LocalizedInput label="Title" value={title} onChange={setTitle} locale={locale} required disabled={disabled} />
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[0.8rem] font-bold">Text ({locale.toUpperCase()})</Label>
              <LocaleDots value={body} />
            </div>
            <RichTextEditor value={body[locale] ?? ""} onChange={(html) => setBody({ ...body, [locale]: html })} disabled={disabled} minHeight={200} />
          </div>
          <MediaField label="Photo" value={media} onChange={setMedia} disabled={disabled} hint="Use only photos with consent on file." />
          <section className="grid gap-2 rounded-[12px] border border-border bg-brand-purple-50 p-3">
            <label className="flex items-start gap-2 text-[0.85rem] font-bold">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} disabled={disabled} className="mt-0.5" />
              <span>
                The person (or guardian) agreed to this story being published
                <span className="block text-[0.74rem] font-normal text-muted-foreground">Required before the story can be published (brief §8).</span>
              </span>
            </label>
            {consent ? (
              <Input value={consentBy} onChange={(e) => setConsentBy(e.target.value)} placeholder="Confirmed by (staff name) and how — e.g. signed form on file" disabled={disabled || (story !== "new" && story.consentConfirmed)} className="min-h-10 rounded-[10px] bg-white" />
            ) : null}
            {story !== "new" && story.consentConfirmedAt ? <p className="text-[0.74rem] text-muted-foreground">Recorded {formatDateTime(story.consentConfirmedAt)}.</p> : null}
          </section>
          {error ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {error}
            </p>
          ) : null}
          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save story"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Stewardship updates ------------------------------------------------------

function UpdatesPanel({ updates, canEdit, onChange }: { updates: StewardshipUpdate[]; canEdit: boolean; onChange: (u: StewardshipUpdate[]) => void }) {
  const [editing, setEditing] = useState<StewardshipUpdate | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StewardshipUpdate | null>(null);
  const [busy, setBusy] = useState(false);

  const upsert = (saved: StewardshipUpdate) => {
    const next = updates.some((u) => u.id === saved.id) ? updates.map((u) => (u.id === saved.id ? saved : u)) : [saved, ...updates];
    onChange([...next].sort((a, b) => (a.date < b.date ? 1 : -1)));
  };

  const togglePublish = async (update: StewardshipUpdate) => {
    try {
      const { data } = await api.post<StewardshipUpdate>(`/api/impact/updates/${update.id}/${update.status === "published" ? "unpublish" : "publish"}`);
      upsert(data);
      toast.success(data.status === "published" ? "Update published." : "Update unpublished.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/impact/updates/${confirmDelete.id}`);
      onChange(updates.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success("Update deleted.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {canEdit ? (
        <div>
          <Button variant="coral" size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            New update
          </Button>
        </div>
      ) : null}
      {updates.length === 0 ? (
        <Card className="rounded-[14px] border border-border px-5 py-8 text-center text-sm text-muted-foreground ring-0 shadow-none">No updates yet. The Impact page shows this section only once an update is published.</Card>
      ) : null}
      {updates.map((update) => (
        <Card key={update.id} className="flex-row items-center gap-4 rounded-[14px] border border-border px-4 py-3 ring-0 shadow-none">
          <div className="w-24 shrink-0 text-[0.74rem] font-extrabold tracking-wider text-brand-purple-600 uppercase">{update.date}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">{update.title.en || `Update #${update.id}`}</span>
              <LocaleDots value={update.title} />
              <StatusBadge published={update.status === "published"} />
            </div>
            <div className="truncate text-[0.78rem] text-muted-foreground">{stripHtml(update.body.en ?? "").slice(0, 140) || "No text yet"}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => togglePublish(update)}>
                {update.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setEditing(update)}>
              <Pencil className="size-3.5" />
              {canEdit ? "Edit" : "View"}
            </Button>
            {canEdit ? (
              <Button variant="ghost" size="sm" className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setConfirmDelete(update)}>
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
      <UpdateSheet
        update={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          upsert(saved);
          setEditing(null);
        }}
      />
      <ConfirmDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Delete this update?" description="It is removed from the site immediately." cta="Delete" destructive busy={busy} onConfirm={remove} />
    </div>
  );
}

function UpdateSheet({ update, canEdit, onClose, onSaved }: { update: StewardshipUpdate | "new" | null; canEdit: boolean; onClose: () => void; onSaved: (u: StewardshipUpdate) => void }) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState<Localized>(emptyLocalized());
  const [body, setBody] = useState<Localized>(emptyLocalized());
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!update) return;
    const u = update === "new" ? null : update;
    setDate(u?.date ?? new Date().toISOString().slice(0, 10));
    setTitle(localizedFrom(u?.title));
    setBody(localizedFrom(u?.body));
    setError(null);
    setLocale("en");
  }, [update]);

  if (!update) return <Sheet open={false} />;
  const isNew = update === "new";
  const disabled = !canEdit || busy;

  const save = async () => {
    if (!title.en?.trim()) return setError("The English title is required.");
    if (!date) return setError("Date is required.");
    setBusy(true);
    setError(null);
    const payload = { date, title, body };
    try {
      const { data } = isNew ? await api.post<StewardshipUpdate>("/api/impact/updates", payload) : await api.patch<StewardshipUpdate>(`/api/impact/updates/${update.id}`, payload);
      toast.success("Update saved.");
      onSaved(data);
    } catch (err) {
      const e = err as ApiError;
      setError(e.errors?.length ? e.errors.map((x) => x.message).join(" ") : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{isNew ? "New stewardship update" : title.en || "Update"}</SheetTitle>
          <SheetDescription>How donations and resources were put to work. Plain, factual, dated.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LocaleTabs value={locale} onChange={setLocale} values={[title, body]} />
            <div className="grid gap-1.5">
              <Label htmlFor="update-date" className="text-[0.8rem] font-bold">
                Date
              </Label>
              <Input id="update-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
          </div>
          <LocalizedInput label="Title" value={title} onChange={setTitle} locale={locale} required disabled={disabled} />
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[0.8rem] font-bold">Text ({locale.toUpperCase()})</Label>
              <LocaleDots value={body} />
            </div>
            <RichTextEditor value={body[locale] ?? ""} onChange={(html) => setBody({ ...body, [locale]: html })} disabled={disabled} minHeight={200} />
          </div>
          {error ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {error}
            </p>
          ) : null}
          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save update"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
