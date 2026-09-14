"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

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
import { LocalizedInput, LocalizedListInput } from "@/components/content/LocalizedInput";
import { MediaField, mediaThumb } from "@/components/content/MediaPicker";
import { SortControls, moveItem } from "@/components/content/SortControls";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { PROGRAM_ICONS, PROGRAM_ICON_LABEL, PROGRAM_TINTS, SITE_URL, emptyLocalized, emptyLocalizedList, listFrom, localizedFrom } from "@/lib/content";
import { formatRelative } from "@/lib/format";
import type { Locale, Localized, LocalizedList, Media, Program } from "@/lib/types";
import { cn } from "@/lib/utils";

// Built-in photos of the launch programs, shown while no media is chosen.
const DEFAULT_CARD: Record<string, string> = {
  "health-and-hope": "/images/program-health-hope-card.jpg",
  care: "/images/program-care-card.jpg",
  empowerment: "/images/program-empowerment-card.jpg",
  "faith-and-community-outreach": "/images/program-faith-card.jpg",
};
const DEFAULT_DETAIL: Record<string, string> = {
  "health-and-hope": "/images/program-health-hope-detail.jpg",
  care: "/images/program-care-detail.png",
  empowerment: "/images/program-empowerment-detail.jpg",
  "faith-and-community-outreach": "/images/program-faith-detail.jpg",
};

const ICON_ITEMS = Object.fromEntries(PROGRAM_ICONS.map((i) => [i, PROGRAM_ICON_LABEL[i]]));
const TINT_ITEMS = { lavender: "Lavender", coral: "Coral" };

type Draft = {
  slug: string;
  visible: boolean;
  icon: string;
  tint: "lavender" | "coral";
  name: Localized;
  cardLine1: Localized;
  cardLine2: Localized;
  summary: Localized;
  purpose: Localized;
  focusItems: LocalizedList;
  cardMedia: Media | null;
  detailMedia: Media | null;
};

const emptyDraft = (): Draft => ({
  slug: "",
  visible: true,
  icon: "heart-pulse",
  tint: "lavender",
  name: emptyLocalized(),
  cardLine1: emptyLocalized(),
  cardLine2: emptyLocalized(),
  summary: emptyLocalized(),
  purpose: emptyLocalized(),
  focusItems: emptyLocalizedList(),
  cardMedia: null,
  detailMedia: null,
});

const toDraft = (p: Program): Draft => ({
  slug: p.slug,
  visible: p.visible,
  icon: p.icon,
  tint: p.tint,
  name: localizedFrom(p.name),
  cardLine1: localizedFrom(p.cardLine1),
  cardLine2: localizedFrom(p.cardLine2),
  summary: localizedFrom(p.summary),
  purpose: localizedFrom(p.purpose),
  focusItems: listFrom(p.focusItems),
  cardMedia: p.cardMedia,
  detailMedia: p.detailMedia,
});

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function ProgramsView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Program | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<Program[]>("/api/programs")
      .then(({ data }) => setPrograms(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const reorder = async (from: number, to: number) => {
    if (!programs) return;
    const next = moveItem(programs, from, to);
    setPrograms(next);
    try {
      const { data } = await api.post<Program[]>("/api/programs/reorder", { ids: next.map((p) => p.id) });
      setPrograms(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleVisible = async (program: Program) => {
    try {
      const { data } = await api.patch<Program>(`/api/programs/${program.id}`, { visible: !program.visible });
      setPrograms((list) => list?.map((p) => (p.id === data.id ? data : p)) ?? null);
      toast.success(data.visible ? `${data.name.en} is visible on the site.` : `${data.name.en} is hidden from the site.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/programs/${confirmDelete.id}`);
      setPrograms((list) => list?.filter((p) => p.id !== confirmDelete.id) ?? null);
      toast.success(`${confirmDelete.name.en} deleted.`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Programs" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.8rem] text-muted-foreground">Order here is the order on the homepage cards and the Programs page. Hidden programs stay editable but do not appear on the site.</p>
          {canEdit ? (
            <Button variant="coral" size="sm" className="ml-auto" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add program
            </Button>
          ) : null}
        </div>
      </Card>

      {programs === null ? (
        <Skeleton className="h-48 w-full rounded-[14px]" />
      ) : (
        <div className="grid gap-3">
          {programs.map((program, index) => {
            const thumb = program.cardMedia ? mediaThumb(program.cardMedia) : `${SITE_URL}${DEFAULT_CARD[program.slug] ?? "/images/cta-community.png"}`;
            return (
              <Card key={program.id} className={cn("flex-row items-center gap-4 rounded-[14px] border border-border px-4 py-3 ring-0 shadow-none", !program.visible && "opacity-70")}>
                <SortControls index={index} count={programs.length} onMove={reorder} disabled={!canEdit} />
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{program.name.en || program.slug}</span>
                    <LocaleDots value={program.name} />
                    {!program.visible ? (
                      <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                        Hidden
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-[0.78rem] text-muted-foreground">
                    /programs#{program.slug} · {PROGRAM_ICON_LABEL[program.icon as keyof typeof PROGRAM_ICON_LABEL] ?? program.icon} · {(program.focusItems.en ?? []).length} focus items · updated {formatRelative(program.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {canEdit ? (
                    <Button variant="ghost" size="sm" onClick={() => toggleVisible(program)} title={program.visible ? "Hide from the site" : "Show on the site"}>
                      {program.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setEditing(program)}>
                    <Pencil className="size-3.5" />
                    {canEdit ? "Edit" : "View"}
                  </Button>
                  {canEdit ? (
                    <Button variant="ghost" size="sm" className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setConfirmDelete(program)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProgramSheet
        program={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          setPrograms((list) => (isNew ? [...(list ?? []), saved] : (list?.map((p) => (p.id === saved.id ? saved : p)) ?? null)));
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this program?"
        description={`${confirmDelete?.name.en ?? ""} disappears from the homepage and the Programs page. Photos stay in the media library.`}
        cta="Delete program"
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

function ProgramSheet({
  program,
  canEdit,
  onClose,
  onSaved,
}: {
  program: Program | "new" | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (program: Program, isNew: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(program && program !== "new" ? toDraft(program) : emptyDraft());
    setError(null);
    setLocale("en");
  }, [program]);

  if (!program) return <Sheet open={false} />;
  const isNew = program === "new";
  const disabled = !canEdit || busy;
  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));

  const save = async () => {
    if (!draft.name.en?.trim()) return setError("The English name is required.");
    setBusy(true);
    setError(null);
    const payload = {
      ...(draft.slug ? { slug: draft.slug } : {}),
      visible: draft.visible,
      icon: draft.icon,
      tint: draft.tint,
      name: draft.name,
      cardLine1: draft.cardLine1,
      cardLine2: draft.cardLine2,
      summary: draft.summary,
      purpose: draft.purpose,
      focusItems: draft.focusItems,
      cardMediaId: draft.cardMedia?.id ?? null,
      detailMediaId: draft.detailMedia?.id ?? null,
    };
    try {
      const { data } = isNew ? await api.post<Program>("/api/programs", payload) : await api.patch<Program>(`/api/programs/${program.id}`, payload);
      toast.success(isNew ? `${data.name.en} added.` : `${data.name.en} saved.`);
      onSaved(data, isNew);
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
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{isNew ? "New program" : draft.name.en || "Program"}</SheetTitle>
          <SheetDescription>Name, purpose and focus items in EN / FR / ES, plus the card and detail photos.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="flex items-center justify-between">
            <LocaleTabs value={locale} onChange={setLocale} values={[draft.name, draft.summary, draft.purpose]} />
            <label className="flex items-center gap-2 text-[0.8rem] font-bold">
              <Checkbox checked={draft.visible} onCheckedChange={(c) => patch({ visible: c === true })} disabled={disabled} />
              Visible on the site
            </label>
          </div>

          <LocalizedInput label="Name" value={draft.name} onChange={(v) => patch({ name: v })} locale={locale} required disabled={disabled} hint="Heading on the Programs page and in the quick navigation." />
          <div className="grid gap-3 sm:grid-cols-2">
            <LocalizedInput label="Card title, line 1" value={draft.cardLine1} onChange={(v) => patch({ cardLine1: v })} locale={locale} disabled={disabled} placeholder="e.g. Be Real" />
            <LocalizedInput label="Card title, line 2" value={draft.cardLine2} onChange={(v) => patch({ cardLine2: v })} locale={locale} disabled={disabled} placeholder="e.g. Health & Hope" />
          </div>
          <LocalizedInput label="Card summary" value={draft.summary} onChange={(v) => patch({ summary: v })} locale={locale} multiline disabled={disabled} hint="One or two sentences under the card title on the homepage." />
          <LocalizedInput label="Purpose" value={draft.purpose} onChange={(v) => patch({ purpose: v })} locale={locale} multiline disabled={disabled} hint="Shown under “Purpose” on the Programs page. Describe broadly — no promises of specific services (brief rule)." />
          <LocalizedListInput label="What this includes" value={draft.focusItems} onChange={(v) => patch({ focusItems: v })} locale={locale} disabled={disabled} hint="One item per line; shown as a checklist." />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-[0.8rem] font-bold">Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => v && patch({ icon: v })} items={ICON_ITEMS} disabled={disabled}>
                <SelectTrigger className="min-h-10 w-full rounded-[10px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_ICONS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {PROGRAM_ICON_LABEL[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[0.8rem] font-bold">Accent</Label>
              <Select value={draft.tint} onValueChange={(v) => v && patch({ tint: v as Draft["tint"] })} items={TINT_ITEMS} disabled={disabled}>
                <SelectTrigger className="min-h-10 w-full rounded-[10px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TINTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TINT_ITEMS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="program-slug" className="text-[0.8rem] font-bold">
                URL anchor
              </Label>
              <Input id="program-slug" value={draft.slug} onChange={(e) => patch({ slug: e.target.value })} placeholder={isNew ? "auto from the name" : ""} disabled={disabled} className="min-h-10 rounded-[10px] bg-white font-mono text-[0.8rem]" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MediaField label="Card photo" value={draft.cardMedia} onChange={(m) => patch({ cardMedia: m })} defaultSrc={!isNew && DEFAULT_CARD[program.slug] ? `${SITE_URL}${DEFAULT_CARD[program.slug]}` : undefined} disabled={disabled} />
            <MediaField label="Detail photo" value={draft.detailMedia} onChange={(m) => patch({ detailMedia: m })} defaultSrc={!isNew && DEFAULT_DETAIL[program.slug] ? `${SITE_URL}${DEFAULT_DETAIL[program.slug]}` : undefined} disabled={disabled} />
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
                {busy ? "Saving…" : isNew ? "Add program" : "Save program"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
