"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, MailPlus, RefreshCw, Search, ShieldCheck, ShieldOff, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode, toQuery } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL, type AdminUser, type PageMeta, type Role, type UserStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["super_admin", "editor", "read_only"];
const STATUSES: UserStatus[] = ["invited", "active", "disabled"];
const ROLE_ITEMS = Object.fromEntries(ROLES.map((r) => [r, ROLE_LABEL[r]]));
const ROLE_FILTER_ITEMS = { all: "All roles", ...ROLE_ITEMS };
const STATUS_FILTER_ITEMS = { all: "All statuses", ...Object.fromEntries(STATUSES.map((s) => [s, STATUS_LABEL[s]])) };

const STATUS_CLASS: Record<UserStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  invited: "border-amber-200 bg-amber-50 text-amber-700",
  disabled: "border-border bg-muted text-muted-foreground",
};

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.email("Enter a valid email address."),
  role: z.enum(ROLES, "Choose a role."),
});
type InviteValues = z.infer<typeof inviteSchema>;

type Confirm = { kind: "deactivate" | "activate" | "reset" | "resend" | "reset2fa"; user: AdminUser } | null;

const CONFIRM_COPY = {
  deactivate: {
    title: "Deactivate this account?",
    body: "They will be signed out immediately and will no longer be able to sign in. You can reactivate them later.",
    cta: "Deactivate",
  },
  activate: {
    title: "Reactivate this account?",
    body: "They will be able to sign in again with their existing password. If they never set one, a new invitation is sent.",
    cta: "Reactivate",
  },
  reset: {
    title: "Send a password reset?",
    body: "They will receive an email with a link to choose a new password. The link is valid for 2 hours.",
    cta: "Send reset link",
  },
  resend: {
    title: "Resend the invitation?",
    body: "A fresh invitation link (valid for 72 hours) will be emailed to them. The previous link stops working.",
    cta: "Resend invitation",
  },
  reset2fa: {
    title: "Reset two-factor authentication?",
    body: "Use this when they lost their phone and their recovery codes. They will sign in with their password only until they set it up again.",
    cta: "Reset 2FA",
  },
} as const;

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function UsersView() {
  const me = useSessionUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, meta } = await api.get<AdminUser[]>(
        `/api/users${toQuery({ q, role: role === "all" ? "" : role, status: status === "all" ? "" : status, page, pageSize: 25 })}`,
      );
      setUsers(data);
      setMeta(meta ?? null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, role, status, page]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  const changeRole = async (user: AdminUser, next: Role) => {
    if (next === user.role) return;
    setBusyId(user.id);
    try {
      const { data } = await api.patch<AdminUser>(`/api/users/${user.id}`, { role: next });
      setUsers((list) => list.map((u) => (u.id === data.id ? data : u)));
      toast.success(`${data.name} is now ${ROLE_LABEL[data.role]}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    setBusyId(user.id);
    try {
      const path = { deactivate: "deactivate", activate: "activate", reset: "reset-password", resend: "resend-invite", reset2fa: "reset-2fa" }[kind];
      const { data } = await api.post<AdminUser | { sent: boolean }>(`/api/users/${user.id}/${path}`);
      if ("id" in data) setUsers((list) => list.map((u) => (u.id === data.id ? data : u)));
      toast.success(
        kind === "reset"
          ? `Password reset email sent to ${user.email}.`
          : kind === "resend"
            ? `Invitation resent to ${user.email}.`
            : kind === "deactivate"
              ? `${user.name} has been deactivated.`
              : kind === "reset2fa"
                ? `Two-factor authentication reset for ${user.name}.`
                : `${user.name} has been reactivated.`,
      );
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Users & roles" />;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-end gap-3">
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
          <Select value={role} onValueChange={(v) => { setRole(v ?? "all"); setPage(1); }} items={ROLE_FILTER_ITEMS}>
            <SelectTrigger className="min-h-10 w-[170px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_FILTER_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }} items={STATUS_FILTER_ITEMS}>
            <SelectTrigger className="min-h-10 w-[170px] rounded-[10px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_FILTER_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button variant="coral" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invite user
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
                <TableHead className="pl-5">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0
                ? [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5" colSpan={5}><Skeleton className="h-9 w-full" /></TableCell>
                    </TableRow>
                  ))
                : users.map((user) => {
                    const isSelf = me != null && String(me.id) === String(user.id);
                    const busy = busyId === user.id;
                    return (
                      <TableRow key={user.id} className={cn(busy && "opacity-60")}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-purple-100 text-[0.72rem] font-extrabold text-brand-purple-700">
                              {initials(user.name)}
                            </span>
                            <div className="leading-tight">
                              <div className="font-bold text-foreground">
                                {user.name}
                                {isSelf ? <span className="ml-1.5 text-[0.68rem] font-semibold text-muted-foreground">(you)</span> : null}
                              </div>
                              <div className="text-[0.78rem] text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(v) => v && changeRole(user, v as Role)}
                            items={ROLE_ITEMS}
                            disabled={isSelf || busy || user.status === "disabled"}
                          >
                            <SelectTrigger className="min-h-9 w-[150px] rounded-[8px] bg-white text-[0.8rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-[6px] font-bold", STATUS_CLASS[user.status])}>
                            {STATUS_LABEL[user.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[0.8rem] text-muted-foreground">
                          <div>{formatRelative(user.lastLoginAt)}</div>
                          <div className={cn("mt-0.5 inline-flex items-center gap-1 text-[0.68rem] font-bold", user.twoFactorEnabled ? "text-emerald-700" : "text-muted-foreground")}>
                            {user.twoFactorEnabled ? <ShieldCheck className="size-3" /> : <ShieldOff className="size-3" />}
                            {user.twoFactorEnabled ? "2FA on" : "2FA off"}
                          </div>
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-1.5">
                            {user.status === "invited" ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "resend", user })}>
                                <MailPlus className="size-3.5" />
                                Resend invite
                              </Button>
                            ) : null}
                            {user.status === "active" ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "reset", user })}>
                                <KeyRound className="size-3.5" />
                                Reset password
                              </Button>
                            ) : null}
                            {user.status === "active" && user.twoFactorEnabled ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "reset2fa", user })}>
                                <ShieldOff className="size-3.5" />
                                Reset 2FA
                              </Button>
                            ) : null}
                            {user.status === "disabled" ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "activate", user })}>
                                <UserRoundCheck className="size-3.5" />
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy || isSelf}
                                className="text-brand-coral-700 hover:text-brand-coral-700"
                                onClick={() => setConfirm({ kind: "deactivate", user })}
                              >
                                <UserRoundX className="size-3.5" />
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!loading && users.length === 0 ? (
                <TableRow>
                  <TableCell className="p-8 text-center text-sm text-muted-foreground" colSpan={5}>
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[0.8rem] text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} users
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(user) => {
          setUsers((list) => [user, ...list]);
          toast.success(`Invitation sent to ${user.email}.`);
        }}
      />

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="rounded-[14px]">
          {confirm ? (
            <>
              <DialogHeader>
                <DialogTitle>{CONFIRM_COPY[confirm.kind].title}</DialogTitle>
                <DialogDescription>
                  <strong className="text-foreground">{confirm.user.name}</strong> · {confirm.user.email}
                  <br />
                  {CONFIRM_COPY[confirm.kind].body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
                <Button
                  variant={confirm.kind === "deactivate" ? "coral" : "purple"}
                  disabled={busyId === confirm.user.id}
                  onClick={runConfirm}
                >
                  {CONFIRM_COPY[confirm.kind].cta}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (user: AdminUser) => void;
}) {
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", role: "editor" } });
  const roleValue = watch("role");

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { data } = await api.post<AdminUser>("/api/users/invite", values);
      onInvited(data);
      reset();
      onOpenChange(false);
    } catch (err) {
      setServerError(errorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); setServerError(null); } onOpenChange(next); }}>
      <DialogContent className="rounded-[14px]">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
            <DialogDescription>They receive an email with a link to set their password (valid 72 hours).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-name`} className="text-[0.8rem] font-bold">Full name</Label>
            <Input id={`${id}-name`} className="min-h-10 rounded-[10px]" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-email`} className="text-[0.8rem] font-bold">Email</Label>
            <Input id={`${id}-email`} type="email" className="min-h-10 rounded-[10px]" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email ? <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.email.message}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-role`} className="text-[0.8rem] font-bold">Role</Label>
            <Select value={roleValue} onValueChange={(v) => v && setValue("role", v as Role, { shouldValidate: true })} items={ROLE_ITEMS}>
              <SelectTrigger id={`${id}-role`} className="min-h-10 w-full rounded-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.74rem] text-muted-foreground">
              Editors manage content and non-sensitive inboxes. Read-only can view but not change anything.
            </p>
          </div>

          {serverError ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {serverError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="coral" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
