"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Film, ImagePlus, Search, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { ApiError, api, apiUpload, toQuery } from "@/lib/api";
import { emptyLocalized } from "@/lib/content";
import type { Locale, Localized, Media, PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function mediaThumb(media: Media) {
  return media.mimeType.startsWith("image/") ? (media.variants.thumb?.url ?? media.url) : null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Upload form shared by the picker and the Media library screen.
const ACCEPT: Record<string, string> = {
  all: "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,application/pdf,video/mp4,video/webm,video/quicktime",
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml",
  pdf: "application/pdf",
  video: "video/mp4,video/webm,video/quicktime",
};

export function UploadForm({
  onUploaded,
  replaceId,
  compact = false,
  kind = "all",
}: {
  onUploaded: (media: Media) => void;
  /** When set, replaces the file behind this media id instead of creating one. */
  replaceId?: number;
  compact?: boolean;
  kind?: "all" | "image" | "pdf" | "video";
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState<Localized>(emptyLocalized());
  const [credit, setCredit] = useState("");
  const [consent, setConsent] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return setError("Choose a file first.");
    if (!replaceId && !alt.en?.trim()) return setError("Alt text in English is required — it describes the photo to screen readers and search engines.");
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (!replaceId) {
        form.append("alt", JSON.stringify(alt));
        form.append("credit", credit);
        form.append("consentOnFile", String(consent));
      }
      const { data } = replaceId ? await apiUpload<Media>(`/api/media/${replaceId}/file`, form, "PUT") : await apiUpload<Media>("/api/media", form);
      onUploaded(data);
      setFile(null);
      setAlt(emptyLocalized());
      setCredit("");
      setConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(replaceId ? "File replaced everywhere it is used." : `${data.filename} uploaded.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <label
        htmlFor={`${id}-file`}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-brand-purple-200 bg-brand-purple-50/60 px-4 text-center text-sm text-muted-foreground hover:bg-brand-purple-50",
          compact ? "py-5" : "py-8",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
      >
        <UploadCloud className="size-6 text-brand-purple-600" />
        {file ? (
          <span className="font-bold text-foreground">
            {file.name} · {formatBytes(file.size)}
          </span>
        ) : (
          <span>
            <span className="font-bold text-brand-purple-800">Choose a file</span> or drop it here — {kind === "video" ? "MP4, WebM or MOV, up to 200 MB" : "JPEG, PNG, WebP, SVG or PDF, up to 15 MB"}
          </span>
        )}
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept={ACCEPT[kind] ?? ACCEPT.all}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {!replaceId ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[0.74rem] font-bold text-muted-foreground uppercase tracking-wider">Describe the file</span>
            <LocaleTabs value={locale} onChange={setLocale} values={[alt]} />
          </div>
          <LocalizedInput label="Alt text" value={alt} onChange={setAlt} locale={locale} required hint="What the photo shows, in one sentence. English is required; FR / ES fall back to it." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-credit`} className="text-[0.8rem] font-bold">
                Credit
              </Label>
              <Input id={`${id}-credit`} value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Photographer or source" className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <label className="flex items-start gap-2 pt-6 text-[0.8rem] font-semibold text-foreground">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
              <span>
                Consent on file
                <span className="block text-[0.72rem] font-normal text-muted-foreground">People shown agreed to publication (brief rule).</span>
              </span>
            </label>
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button variant="coral" onClick={submit} disabled={busy || !file}>
          <ImagePlus className="size-4" />
          {busy ? "Uploading…" : replaceId ? "Replace file" : "Upload"}
        </Button>
      </div>
    </div>
  );
}

// Grid of library items with search; used by the picker and the library screen.
export function MediaGrid({
  onSelect,
  selectedId,
  refreshKey = 0,
  kind = "all",
  compact = false,
}: {
  onSelect: (media: Media) => void;
  selectedId?: number | null;
  refreshKey?: number;
  kind?: "all" | "image" | "pdf" | "video";
  compact?: boolean;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await api.get<Media[]>(`/api/media${toQuery({ q, kind, page, pageSize: compact ? 24 : 40 })}`);
      setItems(data);
      setMeta(meta ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, kind, page, compact]);

  useEffect(() => {
    const handle = setTimeout(load, 200);
    return () => clearTimeout(handle);
  }, [load, refreshKey]);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by file name, alt text or credit"
          className="min-h-10 rounded-[10px] bg-white pl-9"
        />
      </div>
      {loading && items.length === 0 ? (
        <div className={cn("grid gap-3", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6")}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-[10px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-[10px] bg-muted px-4 py-8 text-center text-sm text-muted-foreground">No files yet. Upload the first one.</p>
      ) : (
        <div className={cn("grid gap-3", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6")}>
          {items.map((media) => {
            const thumb = mediaThumb(media);
            return (
              <button
                key={media.id}
                type="button"
                onClick={() => onSelect(media)}
                className={cn(
                  "group grid gap-1 rounded-[10px] border border-border bg-white p-1.5 text-left transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedId === media.id && "border-brand-purple-500 ring-2 ring-brand-purple-200",
                )}
              >
                <div className="relative aspect-square overflow-hidden rounded-[8px] bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={media.alt.en ?? ""} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      {media.mimeType.startsWith("video/") ? <Film className="size-8" /> : <FileText className="size-8" />}
                    </div>
                  )}
                </div>
                <span className="truncate px-0.5 text-[0.7rem] font-bold text-foreground" title={media.filename}>
                  {media.filename}
                </span>
                <span className="truncate px-0.5 text-[0.64rem] text-muted-foreground">
                  {media.width ? `${media.width}×${media.height} · ` : ""}
                  {formatBytes(media.size)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-[0.78rem] text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} files
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
    </div>
  );
}

// Dialog: pick from the library or upload, returns the chosen media.
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  kind = "image",
  title = "Choose a photo",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: Media) => void;
  kind?: "all" | "image" | "pdf" | "video";
  title?: string;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[14px] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pick from the media library or upload a new file. Alt text is required for every image.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "upload")}>
          <TabsList className="rounded-[10px]">
            <TabsTrigger value="library" className="rounded-[8px] px-3">
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-[8px] px-3">
              Upload
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "library" ? (
          <MediaGrid
            compact
            kind={kind}
            refreshKey={refreshKey}
            onSelect={(media) => {
              onSelect(media);
              onOpenChange(false);
            }}
          />
        ) : (
          <UploadForm
            compact
            kind={kind}
            onUploaded={(media) => {
              setRefreshKey((k) => k + 1);
              onSelect(media);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Field: current photo + Choose / Remove. `defaultSrc` shows the site's
// built-in photo when nothing has been chosen yet.
export function MediaField({
  label,
  value,
  onChange,
  defaultSrc,
  disabled,
  hint,
  kind = "image",
}: {
  label: string;
  value: Media | null;
  onChange: (media: Media | null) => void;
  defaultSrc?: string;
  disabled?: boolean;
  hint?: string;
  kind?: "all" | "image" | "pdf" | "video";
}) {
  const [open, setOpen] = useState(false);
  const thumb = value ? mediaThumb(value) : defaultSrc ?? null;

  return (
    <div className="grid gap-1.5">
      <Label className="text-[0.8rem] font-bold">{label}</Label>
      <div className="flex items-center gap-3 rounded-[12px] border border-border bg-white p-2">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-[8px] bg-muted">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              {value?.mimeType.startsWith("video/") ? <Film className="size-6" /> : <FileText className="size-6" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[0.82rem] font-bold text-foreground">{value ? value.filename : defaultSrc ? "Built-in site photo" : "No file chosen"}</div>
          <div className="truncate text-[0.72rem] text-muted-foreground">
            {value ? (value.alt.en || "No alt text") : defaultSrc ? "Choose a photo from the library to replace it." : ""}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
              <ImagePlus className="size-3.5" />
              {value ? "Change" : "Choose"}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => onChange(null)}>
                <Trash2 className="size-3.5" />
                {defaultSrc ? "Use default" : "Remove"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {hint ? <p className="text-[0.74rem] text-muted-foreground">{hint}</p> : null}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={onChange} kind={kind} title={kind === "video" ? "Choose a video" : "Choose a photo"} />
    </div>
  );
}
