"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleDots, LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { MediaField, mediaThumb } from "@/components/content/MediaPicker";
import { SortControls, moveItem } from "@/components/content/SortControls";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { emptyLocalized, localizedFrom } from "@/lib/content";
import { formatDateTime, initials } from "@/lib/format";
import type { Locale, Localized, Media, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = { name: string; visible: boolean; role: Localized; bio: Localized; photo: Media | null };

const emptyDraft = (): Draft => ({ name: "", visible: true, role: emptyLocalized(), bio: emptyLocalized(), photo: null });
const toDraft = (m: TeamMember): Draft => ({ name: m.name, visible: m.visible, role: localizedFrom(m.role), bio: localizedFrom(m.bio), photo: m.photo });

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

// A photo is live on the site the moment it is saved; we only show who set it and when.
function PhotoStatus({ member }: { member: TeamMember }) {
  if (!member.photo) return <span className="text-[0.74rem] text-muted-foreground">No photo — initials are shown</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[0.74rem] font-bold text-emerald-700">
      <BadgeCheck className="size-3.5" />
      Photo live on the site
      {member.photoApprovedAt ? (
        <span className="font-normal text-muted-foreground">
          · added {member.photoApprovedBy ? `by ${member.photoApprovedBy} ` : ""}
          {formatDateTime(member.photoApprovedAt)}
        </span>
      ) : null}
    </span>
  );
}

export function TeamView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin" || me?.role === "editor";
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<TeamMember[]>("/api/team-members")
      .then(({ data }) => setMembers(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const replace = (saved: TeamMember) => setMembers((list) => list?.map((m) => (m.id === saved.id ? saved : m)) ?? null);

  const reorder = async (from: number, to: number) => {
    if (!members) return;
    const next = moveItem(members, from, to);
    setMembers(next);
    try {
      const { data } = await api.post<TeamMember[]>("/api/team-members/reorder", { ids: next.map((m) => m.id) });
      setMembers(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleVisible = async (member: TeamMember) => {
    try {
      const { data } = await api.patch<TeamMember>(`/api/team-members/${member.id}`, { visible: !member.visible });
      replace(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/team-members/${confirmDelete.id}`);
      setMembers((list) => list?.filter((m) => m.id !== confirmDelete.id) ?? null);
      toast.success(`${confirmDelete.name} removed.`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Team" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.8rem] text-muted-foreground">Shown in the About page leadership section, in this order. A photo appears on the site as soon as it is saved here — make sure the person has agreed before you add it.</p>
          {canEdit ? (
            <Button variant="coral" size="sm" className="ml-auto" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add person
            </Button>
          ) : null}
        </div>
      </Card>

      {members === null ? (
        <Skeleton className="h-48 w-full rounded-[14px]" />
      ) : (
        <div className="grid gap-3">
          {members.map((member, index) => {
            const thumb = member.photo ? mediaThumb(member.photo) : null;
            return (
              <Card key={member.id} className={cn("flex-row items-center gap-4 rounded-[14px] border border-border px-4 py-3 ring-0 shadow-none", !member.visible && "opacity-70")}>
                <SortControls index={index} count={members.length} onMove={reorder} disabled={!canEdit} />
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-purple-100 text-[0.9rem] font-extrabold text-brand-purple-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : initials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{member.name}</span>
                    <span className="text-[0.8rem] text-muted-foreground">{member.role.en}</span>
                    <LocaleDots value={member.role} />
                    {!member.visible ? (
                      <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
                        Hidden
                      </Badge>
                    ) : null}
                  </div>
                  <PhotoStatus member={member} />
                </div>
                <div className="flex items-center gap-1.5">
                  {canEdit ? (
                    <Button variant="ghost" size="sm" onClick={() => toggleVisible(member)} title={member.visible ? "Hide from the site" : "Show on the site"}>
                      {member.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setEditing(member)}>
                    <Pencil className="size-3.5" />
                    {canEdit ? "Edit" : "View"}
                  </Button>
                  {canEdit ? (
                    <Button variant="ghost" size="sm" className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setConfirmDelete(member)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <MemberSheet
        key={editing === null ? "none" : editing === "new" ? "new" : editing.id}
        member={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          if (isNew) setMembers((list) => [...(list ?? []), saved]);
          else replace(saved);
          setEditing(isNew ? saved : editing === "new" ? null : saved);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Remove this person?"
        description={`${confirmDelete?.name ?? ""} will no longer appear on the About page.`}
        cta="Remove"
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

function MemberSheet({
  member,
  canEdit,
  onClose,
  onSaved,
}: {
  member: TeamMember | "new" | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (member: TeamMember, isNew: boolean) => void;
}) {
  // State starts from the member being edited; the parent keys this sheet by member so a switch remounts it.
  const [draft, setDraft] = useState<Draft>(() => (member && member !== "new" ? toDraft(member) : emptyDraft()));
  const [locale, setLocale] = useState<Locale>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return <Sheet open={false} />;
  const isNew = member === "new";
  const disabled = !canEdit || busy;
  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));

  const save = async () => {
    if (draft.name.trim().length < 2) return setError("Name is required.");
    setBusy(true);
    setError(null);
    const payload = { name: draft.name.trim(), visible: draft.visible, role: draft.role, bio: draft.bio, photoMediaId: draft.photo?.id ?? null };
    try {
      const { data } = isNew ? await api.post<TeamMember>("/api/team-members", payload) : await api.patch<TeamMember>(`/api/team-members/${member.id}`, payload);
      toast.success(isNew ? `${data.name} added.` : `${data.name} saved.`);
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-lg font-bold text-brand-purple-950">{isNew ? "New team member" : draft.name || "Team member"}</SheetTitle>
          <SheetDescription>Role and bio in EN / FR / ES. The photo is shown on the site as soon as you save.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="flex items-center justify-between">
            <LocaleTabs value={locale} onChange={setLocale} values={[draft.role]} />
            <label className="flex items-center gap-2 text-[0.8rem] font-bold">
              <Checkbox checked={draft.visible} onCheckedChange={(c) => patch({ visible: c === true })} disabled={disabled} />
              Visible on the site
            </label>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="member-name" className="text-[0.8rem] font-bold">
              Full name
            </Label>
            <Input id="member-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          <LocalizedInput label="Role" value={draft.role} onChange={(v) => patch({ role: v })} locale={locale} disabled={disabled} placeholder="e.g. Founder & President" />
          <LocalizedInput label="Short bio" value={draft.bio} onChange={(v) => patch({ bio: v })} locale={locale} multiline disabled={disabled} hint="Optional. Two or three sentences." />
          <MediaField label="Photo" value={draft.photo} onChange={(m) => patch({ photo: m })} disabled={disabled} hint="Goes live on the About page when you save. Leave empty to show the person's initials." />

          {!isNew && member.photo ? (
            <p className="text-[0.78rem] text-muted-foreground">
              <PhotoStatus member={member} />
            </p>
          ) : null}

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
                {busy ? "Saving…" : isNew ? "Add person" : "Save"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
