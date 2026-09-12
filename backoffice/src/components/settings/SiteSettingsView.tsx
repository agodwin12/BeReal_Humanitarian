"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { MediaField } from "@/components/content/MediaPicker";
import { SortControls, moveItem } from "@/components/content/SortControls";
import { useSessionUser } from "@/hooks/use-session";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { LOCALES, LOCALE_NAME, NAV_LABEL, SITE_URL, SOCIAL_LABEL, SOCIAL_PLATFORMS, localizedFrom } from "@/lib/content";
import { formatRelative } from "@/lib/format";
import type { Locale, Localized, Media, NavEntry, SiteSettings, SocialLink } from "@/lib/types";

type Draft = {
  legalName: string;
  shortName: string;
  tagline: Localized;
  statusLine: Localized;
  neutralityStatement: Localized;
  fiscalYear: Localized;
  ein: string;
  showEin: boolean;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  addressNote: Localized;
  socialLinks: SocialLink[];
  navigation: NavEntry[];
  donateEnabled: boolean;
  donateDisabledMessage: Localized;
  enabledLocales: Locale[];
  seoDescription: Localized;
  brandPrimary: string;
  brandAccent: string;
  logo: Media | null;
  favicon: Media | null;
  shareImage: Media | null;
};

const SOCIAL_ITEMS = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, SOCIAL_LABEL[p]]));

function toDraft(s: SiteSettings): Draft {
  return {
    legalName: s.legalName,
    shortName: s.shortName,
    tagline: localizedFrom(s.tagline),
    statusLine: localizedFrom(s.statusLine),
    neutralityStatement: localizedFrom(s.neutralityStatement),
    fiscalYear: localizedFrom(s.fiscalYear),
    ein: s.ein ?? "",
    showEin: s.showEin,
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    addressLine: s.addressLine ?? "",
    addressNote: localizedFrom(s.addressNote),
    socialLinks: s.socialLinks.map((l) => ({ ...l })),
    navigation: s.navigation.map((n) => ({ ...n })),
    donateEnabled: s.donateEnabled,
    donateDisabledMessage: localizedFrom(s.donateDisabledMessage),
    enabledLocales: [...s.enabledLocales],
    seoDescription: localizedFrom(s.seoDescription),
    brandPrimary: s.brandPrimary ?? "#5626a6",
    brandAccent: s.brandAccent ?? "#f26058",
    logo: s.logo,
    favicon: s.favicon,
    shareImage: s.shareImage,
  };
}

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

function Field({ id, label, hint, children }: { id?: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[0.8rem] font-bold">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[0.74rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SiteSettingsView() {
  const me = useSessionUser();
  const canEdit = me?.role === "super_admin";
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<SiteSettings>("/api/site-settings")
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
      const { data } = await api.put<SiteSettings>("/api/site-settings", {
        legalName: draft.legalName,
        shortName: draft.shortName,
        tagline: draft.tagline,
        statusLine: draft.statusLine,
        neutralityStatement: draft.neutralityStatement,
        fiscalYear: draft.fiscalYear,
        ein: draft.ein || null,
        showEin: draft.showEin,
        contactEmail: draft.contactEmail || null,
        contactPhone: draft.contactPhone || null,
        addressLine: draft.addressLine || null,
        addressNote: draft.addressNote,
        socialLinks: draft.socialLinks.filter((l) => l.url.trim()),
        navigation: draft.navigation.map((n) => ({ key: n.key, visible: n.visible })),
        donateEnabled: draft.donateEnabled,
        donateDisabledMessage: draft.donateDisabledMessage,
        enabledLocales: draft.enabledLocales,
        seoDescription: draft.seoDescription,
        brandPrimary: draft.brandPrimary || null,
        brandAccent: draft.brandAccent || null,
        logoMediaId: draft.logo?.id ?? null,
        faviconMediaId: draft.favicon?.id ?? null,
        shareMediaId: draft.shareImage?.id ?? null,
      });
      setSettings(data);
      setDraft(toDraft(data));
      toast.success("Site settings saved. The website picks them up within a minute.");
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.errors?.length ? `${e.message}: ${e.errors.map((x) => x.message).join("; ")}` : errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Site settings" />;
  if (loadError) return <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>;
  if (!draft || !settings) return <Skeleton className="h-64 w-full rounded-[14px]" />;

  const localizedValues = [draft.tagline, draft.statusLine, draft.neutralityStatement, draft.fiscalYear, draft.addressNote, draft.seoDescription];
  const disabled = !canEdit || saving;

  return (
    <div className="grid gap-4">
      <Card className="gap-3 rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <LocaleTabs value={locale} onChange={setLocale} values={localizedValues} />
          <span className="text-[0.78rem] text-muted-foreground">Last saved {formatRelative(settings.updatedAt)}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                View site
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            {canEdit ? (
              <Button variant="coral" size="sm" onClick={save} disabled={saving}>
                <Save className="size-3.5" />
                {saving ? "Saving…" : "Save settings"}
              </Button>
            ) : (
              <span className="rounded-[8px] bg-muted px-2.5 py-1 text-[0.74rem] font-bold text-muted-foreground">Read-only · Super Admin can edit</span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Identity" description="How the organization is named and pictured across the site.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="legalName" label="Legal name">
              <Input id="legalName" value={draft.legalName} onChange={(e) => patch({ legalName: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </Field>
            <Field id="shortName" label="Short name">
              <Input id="shortName" value={draft.shortName} onChange={(e) => patch({ shortName: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </Field>
          </div>
          <LocalizedInput label="Tagline" value={draft.tagline} onChange={(v) => patch({ tagline: v })} locale={locale} disabled={disabled} hint="Shown in the footer." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="brandPrimary" label="Primary color">
              <div className="flex items-center gap-2">
                <input type="color" value={draft.brandPrimary} onChange={(e) => patch({ brandPrimary: e.target.value })} disabled={disabled} className="size-10 rounded-[8px] border border-input bg-white" aria-label="Primary color" />
                <Input id="brandPrimary" value={draft.brandPrimary} onChange={(e) => patch({ brandPrimary: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white font-mono" />
              </div>
            </Field>
            <Field id="brandAccent" label="Accent color">
              <div className="flex items-center gap-2">
                <input type="color" value={draft.brandAccent} onChange={(e) => patch({ brandAccent: e.target.value })} disabled={disabled} className="size-10 rounded-[8px] border border-input bg-white" aria-label="Accent color" />
                <Input id="brandAccent" value={draft.brandAccent} onChange={(e) => patch({ brandAccent: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white font-mono" />
              </div>
            </Field>
          </div>
          <MediaField label="Logo" value={draft.logo} onChange={(m) => patch({ logo: m })} defaultSrc={`${SITE_URL}/images/logo.jpg`} disabled={disabled} hint="Square works best; the header shows it at 56 px." />
          <div className="grid gap-3 sm:grid-cols-2">
            <MediaField label="Favicon" value={draft.favicon} onChange={(m) => patch({ favicon: m })} disabled={disabled} kind="image" />
            <MediaField label="Social share image" value={draft.shareImage} onChange={(m) => patch({ shareImage: m })} disabled={disabled} hint="Shown when a page is shared on Facebook, WhatsApp… 1200×630 recommended." />
          </div>
        </Section>

        <Section title="Contact" description="Rows appear on the Contact page only when a value exists — nothing is invented.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="contactEmail" label="Public email" hint="[TO CONFIRM] in the brief — leave empty until the organization supplies it.">
              <Input id="contactEmail" type="email" value={draft.contactEmail} onChange={(e) => patch({ contactEmail: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </Field>
            <Field id="contactPhone" label="Public phone">
              <Input id="contactPhone" value={draft.contactPhone} onChange={(e) => patch({ contactPhone: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
            </Field>
          </div>
          <Field id="addressLine" label="Mailing address">
            <Input id="addressLine" value={draft.addressLine} onChange={(e) => patch({ addressLine: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white" />
          </Field>
          <LocalizedInput label="Address note" value={draft.addressNote} onChange={(v) => patch({ addressNote: v })} locale={locale} disabled={disabled} hint="e.g. “Registered office — for mail only, not a walk-in office”." />
          <div className="grid gap-2">
            <Label className="text-[0.8rem] font-bold">Social links</Label>
            {draft.socialLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={link.platform}
                  onValueChange={(v) => v && patch({ socialLinks: draft.socialLinks.map((l, i) => (i === index ? { ...l, platform: v } : l)) })}
                  items={SOCIAL_ITEMS}
                  disabled={disabled}
                >
                  <SelectTrigger className="min-h-10 w-[150px] rounded-[10px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {SOCIAL_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={link.url}
                  onChange={(e) => patch({ socialLinks: draft.socialLinks.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)) })}
                  placeholder="https://…"
                  disabled={disabled}
                  className="min-h-10 flex-1 rounded-[10px] bg-white"
                />
                <Button variant="ghost" size="icon-sm" aria-label="Remove link" disabled={disabled} onClick={() => patch({ socialLinks: draft.socialLinks.filter((_, i) => i !== index) })}>
                  <Trash2 className="size-4 text-brand-coral-700" />
                </Button>
              </div>
            ))}
            <div>
              <Button variant="outline" size="sm" disabled={disabled || draft.socialLinks.length >= 10} onClick={() => patch({ socialLinks: [...draft.socialLinks, { platform: "instagram", url: "" }] })}>
                <Plus className="size-3.5" />
                Add social link
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Compliance" description="501(c)(3) wording shown in the footer and on the About page.">
          <LocalizedInput label="Status line" value={draft.statusLine} onChange={(v) => patch({ statusLine: v })} locale={locale} disabled={disabled} multiline />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field id="ein" label="EIN">
              <Input id="ein" value={draft.ein} onChange={(e) => patch({ ein: e.target.value })} disabled={disabled} className="min-h-10 rounded-[10px] bg-white font-mono" />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-[0.8rem] font-bold">
              <Checkbox checked={draft.showEin} onCheckedChange={(c) => patch({ showEin: c === true })} disabled={disabled} />
              Show EIN on the site
            </label>
          </div>
          <LocalizedInput label="Political-neutrality statement" value={draft.neutralityStatement} onChange={(v) => patch({ neutralityStatement: v })} locale={locale} disabled={disabled} multiline />
          <LocalizedInput label="Fiscal year" value={draft.fiscalYear} onChange={(v) => patch({ fiscalYear: v })} locale={locale} disabled={disabled} />
        </Section>

        <Section title="Navigation & donations" description="Order and visibility of the header menu; the Donate button switch.">
          <div className="grid gap-1.5">
            {draft.navigation.map((entry, index) => (
              <div key={entry.key} className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-2 py-1">
                <SortControls index={index} count={draft.navigation.length} disabled={disabled} onMove={(from, to) => patch({ navigation: moveItem(draft.navigation, from, to) })} />
                <span className="flex-1 text-[0.85rem] font-bold text-foreground">{NAV_LABEL[entry.key] ?? entry.key}</span>
                <span className="text-[0.72rem] text-muted-foreground">{entry.href}</span>
                <label className="flex items-center gap-1.5 text-[0.76rem] font-bold">
                  <Checkbox checked={entry.visible} onCheckedChange={(c) => patch({ navigation: draft.navigation.map((n) => (n.key === entry.key ? { ...n, visible: c === true } : n)) })} disabled={disabled} />
                  Visible
                </label>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[0.85rem] font-bold">
            <Checkbox checked={draft.donateEnabled} onCheckedChange={(c) => patch({ donateEnabled: c === true })} disabled={disabled} />
            Show the Donate button site-wide
          </label>
          {!draft.donateEnabled ? (
            <LocalizedInput label="Message while donations are off" value={draft.donateDisabledMessage} onChange={(v) => patch({ donateDisabledMessage: v })} locale={locale} disabled={disabled} hint="Shown on the Get Involved page in place of the Donate button." />
          ) : null}
        </Section>

        <Section title="Languages" description="Hide French or Spanish until a native speaker has reviewed them. English is always on.">
          <div className="flex flex-wrap gap-4">
            {LOCALES.map((l) => (
              <label key={l} className="flex items-center gap-2 text-[0.85rem] font-bold">
                <Checkbox
                  checked={draft.enabledLocales.includes(l)}
                  disabled={disabled || l === "en"}
                  onCheckedChange={(c) => patch({ enabledLocales: c === true ? [...new Set([...draft.enabledLocales, l])] : draft.enabledLocales.filter((x) => x !== l) })}
                />
                {LOCALE_NAME[l]}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Search & social defaults" description="Per-page titles and descriptions are edited on each page; this is the fallback.">
          <LocalizedInput label="Default description" value={draft.seoDescription} onChange={(v) => patch({ seoDescription: v })} locale={locale} disabled={disabled} multiline maxLength={320} />
        </Section>
      </div>
    </div>
  );
}
