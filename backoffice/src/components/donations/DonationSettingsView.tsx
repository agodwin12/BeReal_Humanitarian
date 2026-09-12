"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Mail, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { ApiError, api, apiDownload, isDemoMode } from "@/lib/api";
import { LOCALE_NAME, localizedFrom } from "@/lib/content";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { DonationSettings, Locale, Localized } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = {
  suggestedAmounts: string;
  minimum: string;
  maximum: string;
  donateEnabled: boolean;
  donateDisabledMessage: Localized;
  thankYouMessage: Localized;
  receiptIntro: Localized;
  receiptIrsStatement: Localized;
  receiptSignoff: Localized;
  receiptSenderName: string;
  receiptReplyTo: string;
  statementDescriptor: string;
};

const toDraft = (s: DonationSettings): Draft => ({
  suggestedAmounts: s.suggestedAmounts.join(", "),
  minimum: (s.minimumAmountCents / 100).toFixed(2),
  maximum: (s.maximumAmountCents / 100).toFixed(2),
  donateEnabled: s.donateEnabled,
  donateDisabledMessage: localizedFrom(s.donateDisabledMessage),
  thankYouMessage: localizedFrom(s.thankYouMessage),
  receiptIntro: localizedFrom(s.receiptIntro),
  receiptIrsStatement: localizedFrom(s.receiptIrsStatement),
  receiptSignoff: localizedFrom(s.receiptSignoff),
  receiptSenderName: s.receiptSenderName ?? "",
  receiptReplyTo: s.receiptReplyTo ?? "",
  statementDescriptor: s.statementDescriptor ?? "",
});

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
      <div>
        <h2 className="text-[0.95rem] font-bold text-brand-purple-950">{title}</h2>
        {description ? <p className="text-[0.8rem] text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function DonationSettingsView() {
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Locale | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<DonationSettings>("/api/donation-settings")
      .then(({ data }) => {
        setSettings(data);
        setDraft(toDraft(data));
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const patch = (changes: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...changes } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await api.put<DonationSettings>("/api/donation-settings", {
        suggestedAmounts: draft.suggestedAmounts.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0),
        minimumAmountCents: Math.round(Number(draft.minimum) * 100),
        maximumAmountCents: Math.round(Number(draft.maximum) * 100),
        donateEnabled: draft.donateEnabled,
        donateDisabledMessage: draft.donateDisabledMessage,
        thankYouMessage: draft.thankYouMessage,
        receiptIntro: draft.receiptIntro,
        receiptIrsStatement: draft.receiptIrsStatement,
        receiptSignoff: draft.receiptSignoff,
        receiptSenderName: draft.receiptSenderName || null,
        receiptReplyTo: draft.receiptReplyTo || null,
        statementDescriptor: draft.statementDescriptor || null,
      });
      setSettings(data);
      setDraft(toDraft(data));
      toast.success("Donation settings saved.");
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.errors?.length ? `${e.message}: ${e.errors.map((x) => x.message).join("; ")}` : errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (l: Locale) => {
    setTesting(l);
    try {
      const { data } = await api.post<{ to: string }>("/api/donation-settings/test-receipt", { locale: l });
      toast.success(`Sample ${LOCALE_NAME[l]} receipt sent to ${data.to} (check the email log in System if no provider key is set).`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTesting(null);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Donation settings" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!draft || !settings) return <Skeleton className="h-64 w-full rounded-[14px]" />;

  const s = settings.stripe;
  const disabled = saving;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <LocaleTabs value={locale} onChange={setLocale} values={[draft.thankYouMessage, draft.receiptIntro, draft.receiptIrsStatement, draft.receiptSignoff]} />
          <span className="text-[0.78rem] text-muted-foreground">Last saved {formatRelative(settings.updatedAt)}</span>
          <Button variant="coral" size="sm" className="ml-auto" onClick={save} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Stripe connection" description="Keys are read from the API server's environment, never stored here or sent to the browser.">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-[6px] font-bold", s.mode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
              {s.mode.toUpperCase()}
            </Badge>
            <span className="text-[0.82rem]">{s.configured ? `Secret key set · publishable ${s.publishableKeyHint ?? "not set"}` : "No keys yet — checkout runs in simulated mode for review."}</span>
          </div>
          <dl className="grid gap-1.5 text-[0.82rem]">
            <div className="flex justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
              <dt className="font-semibold">Webhook</dt>
              <dd className="text-muted-foreground">{s.webhookConfigured ? `Signing secret set · POST ${s.webhookEndpoint}` : `Not configured · endpoint ${s.webhookEndpoint}`}</dd>
            </div>
            <div className="flex justify-between rounded-[10px] bg-brand-purple-50 px-3 py-2">
              <dt className="font-semibold">Events received</dt>
              <dd className="text-muted-foreground">{s.eventCount}{s.lastEventAt ? ` · last ${s.lastEventType} ${formatRelative(s.lastEventAt)}` : ""}</dd>
            </div>
          </dl>
          <p className="text-[0.74rem] text-muted-foreground">
            When Desmond opens the Stripe account: set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET on the API, register the webhook for checkout.session.completed, checkout.session.expired and charge.refunded, and turn off Stripe&apos;s own receipt emails (Settings → Customer emails) so donors receive only ours.
          </p>
          <Button variant="outline" size="sm" asChild className="w-fit">
            <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Stripe dashboard
            </a>
          </Button>
        </Section>

        <Section title="Donate page" description="What donors see. Amounts are US dollars; the donor pays exactly the chosen amount and the organization absorbs the fees.">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-3">
              <Label htmlFor="ds-amounts" className="text-[0.8rem] font-bold">
                Suggested amounts
              </Label>
              <Input id="ds-amounts" value={draft.suggestedAmounts} onChange={(e) => patch({ suggestedAmounts: e.target.value })} placeholder="25, 50, 100, 250" disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
              <p className="text-[0.74rem] text-muted-foreground">Up to 6, comma-separated. Duplicates are removed and the list is sorted.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ds-min" className="text-[0.8rem] font-bold">
                Minimum ($)
              </Label>
              <Input id="ds-min" inputMode="decimal" value={draft.minimum} onChange={(e) => patch({ minimum: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ds-max" className="text-[0.8rem] font-bold">
                Maximum ($)
              </Label>
              <Input id="ds-max" inputMode="decimal" value={draft.maximum} onChange={(e) => patch({ maximum: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ds-desc" className="text-[0.8rem] font-bold">
                Card statement text
              </Label>
              <Input id="ds-desc" value={draft.statementDescriptor} onChange={(e) => patch({ statementDescriptor: e.target.value.toUpperCase().slice(0, 22) })} maxLength={22} disabled={disabled} className="min-h-10 rounded-[10px] bg-white font-mono" />
              <p className="text-[0.74rem] text-muted-foreground">Max 22 characters, letters and numbers.</p>
            </div>
          </div>
          <LocalizedInput label="Thank-you message" value={draft.thankYouMessage} onChange={(v) => patch({ thankYouMessage: v })} locale={locale} multiline disabled={disabled} hint="Shown on the thank-you page after a successful gift." />
          <label className="flex items-center gap-2 text-[0.85rem] font-bold">
            <Checkbox checked={draft.donateEnabled} onCheckedChange={(c) => patch({ donateEnabled: c === true })} disabled={disabled} />
            Accept donations (kill switch — hides every Donate button when off)
          </label>
          {!draft.donateEnabled ? <LocalizedInput label="Message while donations are off" value={draft.donateDisabledMessage} onChange={(v) => patch({ donateDisabledMessage: v })} locale={locale} disabled={disabled} /> : null}
        </Section>

        <Section title="Receipt wording" description="Emailed (with a PDF) in the donor's language right after payment. Identity — legal name, EIN, address — comes from Site settings.">
          <LocalizedInput label="Opening paragraph" value={draft.receiptIntro} onChange={(v) => patch({ receiptIntro: v })} locale={locale} multiline disabled={disabled} />
          <LocalizedInput label="IRS statement" value={draft.receiptIrsStatement} onChange={(v) => patch({ receiptIrsStatement: v })} locale={locale} multiline disabled={disabled} hint="Must say that no goods or services were provided in exchange (required for gifts of $250 or more)." />
          <LocalizedInput label="Sign-off" value={draft.receiptSignoff} onChange={(v) => patch({ receiptSignoff: v })} locale={locale} disabled={disabled} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ds-sender" className="text-[0.8rem] font-bold">
                Signed by
              </Label>
              <Input id="ds-sender" value={draft.receiptSenderName} onChange={(e) => patch({ receiptSenderName: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ds-reply" className="text-[0.8rem] font-bold">
                Reply-to email
              </Label>
              <Input id="ds-reply" type="email" value={draft.receiptReplyTo} onChange={(e) => patch({ receiptReplyTo: e.target.value })} placeholder="Leave empty until the public email is confirmed" disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </div>
          </div>
        </Section>

        <Section title="Check a sample receipt" description="Sends a sample receipt (PDF attached) to your own address, or previews the PDF, using the wording saved above.">
          <div className="flex flex-wrap gap-2">
            {(["en", "fr", "es"] as Locale[]).map((l) => (
              <Button key={l} variant="outline" size="sm" disabled={testing !== null} onClick={() => sendTest(l)}>
                <Mail className="size-3.5" />
                {testing === l ? "Sending…" : `Email me the ${LOCALE_NAME[l]} sample`}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["en", "fr", "es"] as Locale[]).map((l) => (
              <Button key={l} variant="ghost" size="sm" onClick={() => apiDownload(`/api/donation-settings/receipt-preview.pdf?locale=${l}`, `receipt-sample-${l}.pdf`).catch((err) => toast.error(errorMessage(err)))}>
                <FileText className="size-3.5" />
                Download {LOCALE_NAME[l]} PDF
              </Button>
            ))}
          </div>
          <p className="text-[0.74rem] text-muted-foreground">Sample amount {formatMoney(5000)} · receipt number BRHW-{new Date().getFullYear()}-SAMPLE · today {formatDateTime(new Date().toISOString())}.</p>
        </Section>
      </div>
    </div>
  );
}
