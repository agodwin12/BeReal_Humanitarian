"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Eye, EyeOff, Film, ImageIcon, Link2, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleDots, LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { MediaField, mediaThumb } from "@/components/content/MediaPicker";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { emptyLocalized, localizedFrom } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import type { GalleryItem, ImpactStoryRef, ImpactOverview, Locale, Localized, Media } from "@/lib/types";
import { cn } from "@/lib/utils";

type VideoSource = "upload" | "link";
type Draft = { kind: "image" | "video"; videoSource: VideoSource; media: Media | null; videoUrl: string; title: Localized; description: Localized; happenedOn: string; location: string; published: boolean; impactStoryId: number | null };

const emptyDraft = (): Draft => ({ kind: "image", videoSource: "upload", media: null, videoUrl: "", title: emptyLocalized(), description: emptyLocalized(), happenedOn: "", location: "", published: true, impactStoryId: null });
const toDraft = (g: GalleryItem): Draft => ({
  kind: g.kind,
  videoSource: g.kind === "video" && g.videoUrl ? "link" : "upload",
  media: g.media,
  videoUrl: g.videoUrl ?? "",
  title: localizedFrom(g.title),
  description: localizedFrom(g.description),
  happenedOn: g.happenedOn ?? "",
  location: g.location ?? "",
  published: g.published,
  impactStoryId: g.impactStoryId,
});

function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.errors?.length) return err.errors.map((e) => e.message).join(" ");
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

const formatDay = (value: string | null) => (value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long" }) : "No date");

export function GalleryView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GalleryItem | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<GalleryItem[]>("/api/gallery")
      .then(({ data }) => setItems(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const replace = (saved: GalleryItem) => setItems((list) => list?.map((g) => (g.id === saved.id ? saved : g)) ?? null);

  const togglePublished = async (item: GalleryItem) => {
    try {
      const { data } = await api.patch<GalleryItem>(`/api/gallery/${item.id}`, { published: !item.published });
      replace(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/gallery/${confirmDelete.id}`);
      setItems((list) => list?.filter((g) => g.id !== confirmDelete.id) ?? null);
      toast.success("Entry removed from the gallery.");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Gallery" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.8rem] text-muted-foreground">
            Every entry appears on the website as soon as it is saved (untick “Published” to hide one). Photos need alt text; videos can be uploaded (MP4 / WebM / MOV up to 200 MB) or linked from YouTube / Vimeo. Only publish photos of people who agreed to it.
          </p>
          {canEdit ? (
            <Button variant="coral" size="sm" className="ml-auto" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add photo or video
            </Button>
          ) : null}
        </div>
      </Card>

      {items === null ? (
        <Skeleton className="h-48 w-full rounded-[14px]" />
      ) : items.length === 0 ? (
        <Card className="rounded-[14px] border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground ring-0 shadow-none">Nothing in the gallery yet. Add the first photo or video.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const thumb = item.media ? mediaThumb(item.media) : null;
            return (
              <Card key={item.id} className={cn("gap-0 overflow-hidden rounded-[14px] border border-border p-0 ring-0 shadow-none", !item.published && "opacity-70")}>
                <div className="relative aspect-[4/3] bg-brand-purple-50">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1 text-brand-purple-600">
                      {item.kind === "video" ? <Film className="size-8" /> : <ImageIcon className="size-8" />}
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider">{item.kind === "video" ? (item.videoUrl ? "Video link" : "Video file") : "No photo"}</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-[6px] bg-white/90 px-1.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-brand-purple-800">{item.kind === "video" ? "Video" : "Photo"}</span>
                  {!item.published ? (
                    <Badge variant="outline" className="absolute top-2 right-2 rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                      Hidden
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-1.5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-foreground">{item.title.en || "Untitled"}</span>
                    <LocaleDots value={item.title} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.76rem] text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDay(item.happenedOn)}
                    {item.location ? <span>· {item.location}</span> : null}
                  </div>
                  {item.impactStory ? (
                    <Badge variant="outline" className="w-fit rounded-[6px] border-brand-purple-100 bg-brand-purple-50 font-bold text-brand-purple-800">
                      <Link2 className="size-3" /> {item.impactStory.title.en || `Story #${item.impactStory.id}`}
                    </Badge>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1.5">
                    {canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => togglePublished(item)} title={item.published ? "Hide from the site" : "Show on the site"}>
                        {item.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setEditing(item)}>
                      <Pencil className="size-3.5" />
                      {canEdit ? "Edit" : "View"}
                    </Button>
                    {canEdit ? (
                      <Button variant="ghost" size="sm" className="ml-auto text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setConfirmDelete(item)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EntrySheet
        key={editing === null ? "none" : editing === "new" ? "new" : editing.id}
        item={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          if (isNew) setItems((list) => [saved, ...(list ?? [])]);
          else replace(saved);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Remove this entry?"
        description={`“${confirmDelete?.title.en ?? ""}” will disappear from the website's Gallery page. The file stays in the media library.`}
        cta="Remove"
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

function EntrySheet({ item, canEdit, onClose, onSaved }: { item: GalleryItem | "new" | null; canEdit: boolean; onClose: () => void; onSaved: (item: GalleryItem, isNew: boolean) => void }) {
  const [draft, setDraft] = useState<Draft>(() => (item && item !== "new" ? toDraft(item) : emptyDraft()));
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<ImpactStoryRef[]>([]);

  useEffect(() => {
    if (isDemoMode || !item) return;
    api
      .get<ImpactOverview>("/api/impact")
      .then(({ data }) => setStories(data.stories))
      .catch(() => setStories([]));
  }, [item]);

  if (!item) return <Sheet open={false} />;
  const isNew = item === "new";
  const disabled = !canEdit || busy;
  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));

  const save = async () => {
    if (!(draft.title.en ?? "").trim()) return setError("Title in English is required.");
    if (draft.kind === "image" && !draft.media) return setError("Choose a photo.");
    if (draft.kind === "video" && draft.videoSource === "upload" && !draft.media) return setError("Upload or choose a video file.");
    if (draft.kind === "video" && draft.videoSource === "link" && !draft.videoUrl.trim()) return setError("Paste the YouTube or Vimeo link.");
    setBusy(true);
    setError(null);
    const payload = {
      kind: draft.kind,
      mediaId: draft.kind === "image" || draft.videoSource === "upload" ? draft.media?.id ?? null : null,
      videoUrl: draft.kind === "video" && draft.videoSource === "link" ? draft.videoUrl.trim() : null,
      title: draft.title,
      description: draft.description,
      happenedOn: draft.happenedOn || null,
      location: draft.location.trim() || null,
      published: draft.published,
      impactStoryId: draft.impactStoryId,
    };
    try {
      const { data } = isNew ? await api.post<GalleryItem>("/api/gallery", payload) : await api.patch<GalleryItem>(`/api/gallery/${item.id}`, payload);
      toast.success(isNew ? "Added to the gallery." : "Saved.");
      onSaved(data, isNew);
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
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{isNew ? "New gallery entry" : draft.title.en || "Gallery entry"}</SheetTitle>
          <SheetDescription>Title and description in EN / FR / ES, the day it happened, and the photo or video.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="grid gap-1.5">
            <Label className="text-[0.8rem] font-bold">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["image", "video"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ kind, media: null })}
                  className={cn("flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[0.85rem] font-bold", draft.kind === kind ? "border-brand-purple-600 bg-brand-purple-600 text-white" : "border-border bg-white text-brand-purple-950 hover:bg-brand-purple-50")}
                  aria-pressed={draft.kind === kind}
                >
                  {kind === "image" ? <ImageIcon className="size-4" /> : <Film className="size-4" />}
                  {kind === "image" ? "Photo" : "Video"}
                </button>
              ))}
            </div>
          </div>

          {draft.kind === "image" ? (
            <MediaField label="Photo" value={draft.media} onChange={(m) => patch({ media: m })} disabled={disabled} kind="image" hint="Pick from the media library or upload. Alt text is required for accessibility." />
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                {(["upload", "link"] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ videoSource: source })}
                    className={cn("flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-[0.8rem] font-bold", draft.videoSource === source ? "border-brand-purple-600 bg-brand-purple-50 text-brand-purple-800" : "border-border bg-white text-muted-foreground hover:bg-brand-purple-50")}
                    aria-pressed={draft.videoSource === source}
                  >
                    {source === "upload" ? <UploadCloud className="size-4" /> : <Link2 className="size-4" />}
                    {source === "upload" ? "Upload a video file" : "YouTube / Vimeo link"}
                  </button>
                ))}
              </div>
              {draft.videoSource === "upload" ? (
                <MediaField label="Video file" value={draft.media} onChange={(m) => patch({ media: m })} disabled={disabled} kind="video" hint="MP4, WebM or MOV up to 200 MB. It plays directly on the page." />
              ) : (
                <div className="grid gap-1.5">
                  <Label htmlFor="gallery-url" className="text-[0.8rem] font-bold">
                    Video link
                  </Label>
                  <Input id="gallery-url" value={draft.videoUrl} onChange={(e) => patch({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…" disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
                  <p className="text-[0.74rem] text-muted-foreground">The video is embedded on the page and plays from YouTube or Vimeo.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <LocaleTabs value={locale} onChange={setLocale} values={[draft.title, draft.description]} />
            <label className="flex items-center gap-2 text-[0.8rem] font-bold">
              <Checkbox checked={draft.published} onCheckedChange={(c) => patch({ published: c === true })} disabled={disabled} />
              Published
            </label>
          </div>
          <LocalizedInput label="Title" value={draft.title} onChange={(v) => patch({ title: v })} locale={locale} required disabled={disabled} placeholder="e.g. Food distribution in Calvary" />
          <LocalizedInput label="Description" value={draft.description} onChange={(v) => patch({ description: v })} locale={locale} multiline disabled={disabled} hint="What happened, who it helped. Two or three sentences." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="gallery-date" className="text-[0.8rem] font-bold">
                Day it happened
              </Label>
              <Input id="gallery-date" type="date" value={draft.happenedOn} onChange={(e) => patch({ happenedOn: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gallery-location" className="text-[0.8rem] font-bold">
                Place (optional)
              </Label>
              <Input id="gallery-location" value={draft.location} onChange={(e) => patch({ location: e.target.value })} placeholder="e.g. Calvary, Cameroon" disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[0.8rem] font-bold">Part of this Impact story (optional)</Label>
            <Select value={draft.impactStoryId ? String(draft.impactStoryId) : "none"} onValueChange={(v) => patch({ impactStoryId: v === "none" ? null : Number(v) })} disabled={disabled}>
              <SelectTrigger className="min-h-10 w-full rounded-[10px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {stories.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.title.en || `Story #${s.id}`}
                    {s.status === "draft" ? " (draft)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.74rem] text-muted-foreground">Lets visitors open “View Full Impact Story” from this photo or video on the website (once the story is published).</p>
          </div>

          {!isNew ? <p className="text-[0.72rem] text-muted-foreground">Added {formatDateTime(item.createdAt)} · last change {formatDateTime(item.updatedAt)}</p> : null}

          {error ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {error}
            </p>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Close
              </Button>
              <Button variant="coral" onClick={save} disabled={busy}>
                {busy ? "Saving…" : isNew ? "Add to gallery" : "Save"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
