"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { getSessionUser, setSession, getSessionToken } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL, type AdminUser } from "@/lib/types";

// Show the field-level reason (e.g. "Enter the 6-digit code…") instead of the generic "Validation failed".
function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.errors?.length) return err.errors.map((e) => e.message).join(" ");
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

export function SecurityView() {
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<AdminUser>("/api/auth/me")
      .then(({ data }) => setMe(data))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  // Keep the cached session profile in sync (sidebar, dashboard).
  const refresh = (user: AdminUser) => {
    setMe(user);
    const session = getSessionUser();
    const token = getSessionToken();
    if (session && token) setSession(token, { ...session, twoFactorEnabled: user.twoFactorEnabled });
  };

  if (isDemoMode) return <DemoNotice screen="Security" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!me) return <Skeleton className="h-64 w-full rounded-[14px]" />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[0.95rem] font-bold text-brand-purple-950">Two-factor authentication</h2>
          {me.twoFactorEnabled ? (
            <Badge variant="outline" className="rounded-[6px] border-emerald-200 bg-emerald-50 font-bold text-emerald-700">
              <ShieldCheck className="size-3" /> On
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-[6px] border-amber-200 bg-amber-50 font-bold text-amber-800">
              <ShieldOff className="size-3" /> Off
            </Badge>
          )}
        </div>
        <p className="text-[0.82rem] text-muted-foreground">
          Signing in then also asks for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).
          {me.role === "super_admin" ? " Strongly recommended for Super Admins — this account can see donations and Request Assistance messages." : ""}
        </p>
        {me.twoFactorEnabled ? (
          <>
            <dl className="grid gap-2 text-[0.82rem]">
              <div className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
                <dt className="font-semibold">Enabled since</dt>
                <dd className="text-muted-foreground">{formatDateTime(me.twoFactorEnabledAt ?? null)}</dd>
              </div>
              <div className="flex items-center justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
                <dt className="font-semibold">Recovery codes left</dt>
                <dd className={me.recoveryCodesLeft && me.recoveryCodesLeft <= 3 ? "font-bold text-brand-coral-700" : "text-muted-foreground"}>{me.recoveryCodesLeft ?? 0} of 10</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
                <KeyRound className="size-3.5" />
                New recovery codes
              </Button>
              <Button variant="ghost" size="sm" className="text-brand-coral-700 hover:text-brand-coral-700" onClick={() => setDisableOpen(true)}>
                <ShieldOff className="size-3.5" />
                Turn off
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button variant="coral" size="sm" onClick={() => setSetupOpen(true)}>
              <ShieldCheck className="size-4" />
              Set up two-factor authentication
            </Button>
          </div>
        )}
        <p className="text-[0.74rem] text-muted-foreground">Locked out? A Super Admin can reset your authenticator from Users &amp; roles.</p>
      </Card>

      <PasswordCard />

      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} onEnabled={refresh} />
      <DisableDialog open={disableOpen} onOpenChange={setDisableOpen} onDisabled={refresh} />
      <RegenerateDialog open={regenOpen} onOpenChange={setRegenOpen} onRegenerated={refresh} />
    </div>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Recovery codes copied.");
    } catch {
      toast.error("Could not copy — write them down instead.");
    }
  };
  return (
    <div className="grid gap-2">
      <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8rem] font-semibold text-amber-900">
        Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. They are shown only now.
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-brand-purple-950 p-3 font-mono text-[0.85rem] text-brand-purple-100">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="size-3.5" />
          Copy codes
        </Button>
      </div>
    </div>
  );
}

function SetupDialog({ open, onOpenChange, onEnabled }: { open: boolean; onOpenChange: (o: boolean) => void; onEnabled: (u: AdminUser) => void }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSecret(null);
      setQr(null);
      setCode("");
      setCodes(null);
      setError(null);
      return;
    }
    api
      .post<{ secret: string; otpauthUri: string }>("/api/auth/2fa/setup")
      .then(async ({ data }) => {
        setSecret(data.secret);
        setQr(await QRCode.toDataURL(data.otpauthUri, { width: 220, margin: 1, color: { dark: "#211044", light: "#ffffff" } }));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [open]);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ recoveryCodes: string[]; user: AdminUser }>("/api/auth/2fa/enable", { code: code.trim() });
      setCodes(data.recoveryCodes);
      onEnabled(data.user);
      toast.success("Two-factor authentication is on.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{codes ? "Two-factor authentication is on" : "Set up two-factor authentication"}</DialogTitle>
          <DialogDescription>{codes ? "One last thing: your recovery codes." : "Scan the code with your authenticator app, then enter the 6-digit code it shows."}</DialogDescription>
        </DialogHeader>
        {codes ? (
          <RecoveryCodes codes={codes} />
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-[236px] items-center justify-center rounded-[12px] border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt="QR code for your authenticator app" width={220} height={220} /> : <Skeleton className="size-[220px]" />}
              </div>
              <div className="min-w-0 flex-1 text-[0.8rem] text-muted-foreground">
                <p className="mb-1 font-bold text-foreground">Can&apos;t scan?</p>
                <p>Enter this key manually:</p>
                <code className="mt-1 block rounded-[8px] bg-muted px-2 py-1.5 font-mono text-[0.78rem] break-all text-foreground">{secret ?? "…"}</code>
                <p className="mt-2">Account: Be Real Backoffice · time-based · 6 digits.</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="setup-code" className="text-[0.8rem] font-bold">
                Code from the app
              </Label>
              <Input id="setup-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" className="min-h-11 rounded-[10px] bg-white text-center text-lg tracking-[0.3em]" />
            </div>
            {error ? (
              <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          {codes ? (
            <Button variant="purple" onClick={() => onOpenChange(false)}>
              I saved my codes
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={enable} disabled={busy || !secret || code.trim().length < 6}>
                {busy ? "Checking…" : "Turn on"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisableDialog({ open, onOpenChange, onDisabled }: { open: boolean; onOpenChange: (o: boolean) => void; onDisabled: (u: AdminUser) => void }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ user: AdminUser }>("/api/auth/2fa/disable", { password, code: code.trim() });
      onDisabled(data.user);
      toast.success("Two-factor authentication is off.");
      onOpenChange(false);
      setPassword("");
      setCode("");
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
          <DialogTitle>Turn off two-factor authentication?</DialogTitle>
          <DialogDescription>Confirm with your password and a current code (or a recovery code).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="disable-password" className="text-[0.8rem] font-bold">
              Password
            </Label>
            <Input id="disable-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="disable-code" className="text-[0.8rem] font-bold">
              Code
            </Label>
            <Input id="disable-code" value={code} onChange={(e) => setCode(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          {error ? (
            <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="coral" onClick={disable} disabled={busy || !password || code.trim().length < 6}>
            {busy ? "Checking…" : "Turn off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegenerateDialog({ open, onOpenChange, onRegenerated }: { open: boolean; onOpenChange: (o: boolean) => void; onRegenerated: (u: AdminUser) => void }) {
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setCodes(null);
      setError(null);
    }
  }, [open]);

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ recoveryCodes: string[]; user: AdminUser }>("/api/auth/2fa/recovery-codes", { code: code.trim() });
      setCodes(data.recoveryCodes);
      onRegenerated(data.user);
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
          <DialogTitle>New recovery codes</DialogTitle>
          <DialogDescription>{codes ? "Your previous codes no longer work." : "Enter a current code from your app. Your previous recovery codes will stop working."}</DialogDescription>
        </DialogHeader>
        {codes ? (
          <RecoveryCodes codes={codes} />
        ) : (
          <div className="grid gap-3">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" className="min-h-10 rounded-[10px] bg-white text-center tracking-[0.3em]" />
            {error ? (
              <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          {codes ? (
            <Button variant="purple" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="coral" onClick={regenerate} disabled={busy || code.trim().length < 6}>
                {busy ? "Checking…" : "Generate"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async () => {
    if (next.length < 10) return setError("The new password must be at least 10 characters.");
    if (next !== confirm) return setError("The two new passwords do not match.");
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
      toast.success("Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
      <h2 className="text-[0.95rem] font-bold text-brand-purple-950">Password</h2>
      <p className="text-[0.82rem] text-muted-foreground">At least 10 characters. Changing it does not sign out other devices.</p>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="pw-current" className="text-[0.8rem] font-bold">
            Current password
          </Label>
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pw-next" className="text-[0.8rem] font-bold">
              New password
            </Label>
            <Input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pw-confirm" className="text-[0.8rem] font-bold">
              Repeat new password
            </Label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
            {error}
          </p>
        ) : null}
        <div>
          <Button variant="purple" size="sm" onClick={change} disabled={busy || !current || !next || !confirm}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </div>
      <p className="text-[0.74rem] text-muted-foreground">Role: {ROLE_LABEL[(getSessionUser()?.role ?? "read_only") as keyof typeof ROLE_LABEL]}</p>
    </Card>
  );
}
