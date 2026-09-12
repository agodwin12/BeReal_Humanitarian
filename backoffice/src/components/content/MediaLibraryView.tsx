"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink, FileText, Trash2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { MediaGrid, UploadForm, formatBytes } from "@/components/content/MediaPicker";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { localizedFrom } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import type { Locale, Localized, Media, MediaUsage } from "@/lib/types";

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function MediaLibraryView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [kind, setKind] = useState<"all" | "image" | "pdf">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Media | null>(null);

  if (isDemoMode) return <DemoNotice screen="Media library" />;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <TabsList className="h-10 rounded-[10px]">
              <TabsTrigger value="all" className="rounded-[8px] px-3">
                All files
              </TabsTrigger>
              <TabsTrigger value="image" className="rounded-[8px] px-3">
                Images
              </TabsTrigger>
              <TabsTrigger value="pdf" className="rounded-[8px] px-3">
                PDFs
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-[0.78rem] text-muted-foreground">Web-size versions are created automatically. Alt text per language is required.</span>
          {canEdit ? (
            <Button variant="coral" size="sm" className="ml-auto" onClick={() => setUploadOpen(true)}>
              <UploadCloud className="size-4" />
              Upload
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <MediaGrid kind={kind} refreshKey={refreshKey} onSelect={setSelected} selectedId={selected?.id} />
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="rounded-[14px] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload a file</DialogTitle>
            <DialogDescription>Photos, the logo, or PDFs. Describe the file so it stays accessible in all three languages.</DialogDescription>
          </DialogHeader>
          <UploadForm
            onUploaded={() => {
              setRefreshKey((k) => k + 1);
              setUploadOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <MediaDetailSheet
        media={selected}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
        onChanged={(next) => {
          setSelected(next);
          setRefreshKey((k) => k + 1);
        }}
        onDeleted={() => {
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function MediaDetailSheet({
  media,
  canEdit,
  onClose,
  onChanged,
  onDeleted,
}: {
  media: Media | null;
  canEdit: boolean;
  onClose: () => void;
  onChanged: (media: Media) => void;
  onDeleted: () => void;
}) {
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [alt, setAlt] = useState<Localized>(localizedFrom(null));
  const [caption, setCaption] = useState<Localized>(localizedFrom(null));
  const [credit, setCredit] = useState("");
  const [consent, setConsent] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);

  useEffect(() => {
    if (!media) return;
    setAlt(localizedFrom(media.alt));
    setCaption(localizedFrom(media.caption));
    setCredit(media.credit ?? "");
    setConsent(media.consentOnFile);
    setUsage(null);
    api
      .get<MediaUsage[]>(`/api/media/${media.id}/usage`)
      .then(({ data }) => setUsage(data))
      .catch(() => setUsage([]));
  }, [media]);

  if (!media) return <Sheet open={false} />;

  const isImage = media.mimeType.startsWith("image/");
  const preview = isImage ? (media.variants.medium?.url ?? media.url) : null;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch<Media>(`/api/media/${media.id}`, { alt, caption, credit: credit || null, consentOnFile: consent });
      onChanged(data);
      toast.success("Details saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/media/${media.id}`);
      toast.success(`${media.filename} deleted.`);
      setConfirmDelete(false);
      onDeleted();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(media.url);
      toast.success("URL copied.");
    } catch {
      toast.error("Could not copy the URL.");
    }
  };

  return (
    <Sheet open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="truncate pr-8 text-lg font-bold text-brand-purple-950">{media.filename}</SheetTitle>
          <SheetDescription>
            {media.mimeType}
            {media.width ? ` · ${media.width}×${media.height}` : ""} · {formatBytes(media.size)} · uploaded {formatDateTime(media.createdAt)}
            {media.uploadedBy ? ` by ${media.uploadedBy.name}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="overflow-hidden rounded-[12px] border border-border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={media.alt.en ?? ""} className="max-h-72 w-full object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
                <FileText className="size-6" />
                {media.filename}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={media.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Open
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="size-3.5" />
              Copy URL
            </Button>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setReplaceOpen(true)}>
                <UploadCloud className="size-3.5" />
                Replace file
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-brand-coral-700 hover:text-brand-coral-700"
                disabled={busy || (usage?.length ?? 0) > 0}
                title={(usage?.length ?? 0) > 0 ? "Still in use — replace it where it is used first" : undefined}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
          </div>

          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Details</h3>
              <LocaleTabs value={locale} onChange={setLocale} values={[alt]} />
            </div>
            <LocalizedInput label="Alt text" value={alt} onChange={setAlt} locale={locale} required disabled={!canEdit || busy} />
            <LocalizedInput label="Caption" value={caption} onChange={setCaption} locale={locale} disabled={!canEdit || busy} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="media-credit" className="text-[0.8rem] font-bold">
                  Credit
                </Label>
                <Input id="media-credit" value={credit} onChange={(e) => setCredit(e.target.value)} disabled={!canEdit || busy} className="min-h-10 rounded-[10px] bg-white" />
              </div>
              <label className="flex items-start gap-2 pt-6 text-[0.8rem] font-semibold">
                <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} disabled={!canEdit || busy} className="mt-0.5" />
                <span>
                  Consent on file
                  <span className="block text-[0.72rem] font-normal text-muted-foreground">People shown agreed to publication.</span>
                </span>
              </label>
            </div>
            {canEdit ? (
              <div className="flex justify-end">
                <Button variant="purple" size="sm" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save details"}
                </Button>
              </div>
            ) : null}
          </section>

          <section className="grid gap-2 border-t border-border pt-4">
            <h3 className="text-[0.72rem] font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Where it is used</h3>
            {usage === null ? (
              <p className="text-[0.8rem] text-muted-foreground">Checking…</p>
            ) : usage.length === 0 ? (
              <p className="text-[0.8rem] text-muted-foreground">Not used anywhere yet — safe to delete.</p>
            ) : (
              <ul className="grid gap-1.5">
                {usage.map((u, i) => (
                  <li key={i} className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2 text-[0.82rem]">
                    <span>
                      <Badge variant="outline" className="mr-2 rounded-[6px] bg-white font-bold uppercase">
                        {u.type}
                      </Badge>
                      <strong>{u.label}</strong> · {u.field}
                    </span>
                    <Link href={u.href} className="font-bold text-brand-purple-700 hover:underline">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {usage && usage.length > 0 ? (
              <p className="text-[0.74rem] text-muted-foreground">“Replace file” swaps the photo everywhere at once, keeping every link above.</p>
            ) : null}
          </section>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this file?"
          description={`${media.filename} will be removed from storage. This cannot be undone.`}
          cta="Delete"
          destructive
          busy={busy}
          onConfirm={remove}
        />

        <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
          <DialogContent className="rounded-[14px] sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Replace the file</DialogTitle>
              <DialogDescription>Upload a new version of {media.filename}. Alt text, caption and every place it is used stay the same.</DialogDescription>
            </DialogHeader>
            <UploadForm
              replaceId={media.id}
              compact
              onUploaded={(next) => {
                setReplaceOpen(false);
                onChanged(next);
              }}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
