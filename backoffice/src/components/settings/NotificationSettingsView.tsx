"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellOff, BellRing, Newspaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { INBOX } from "@/lib/formFields";
import { formatRelative } from "@/lib/format";
import { LOCALE_LABEL, type Locale, type NotificationFormType, type NotificationSetting } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: NotificationFormType[] = ["volunteer", "partnership", "assistance", "contact", "newsletter"];
const LOCALE_ITEMS = LOCALE_LABEL as Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Draft = { recipients: string; locale: Locale; enabled: boolean };

function errorMessage(err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

function parseRecipients(text: string) {
  return [...new Set(text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

function toDraft(setting: NotificationSetting): Draft {
  return { recipients: setting.recipients.join("\n"), locale: setting.locale, enabled: setting.enabled };
}

function labelFor(formType: NotificationFormType) {
  if (formType === "newsletter") {
    return { title: "Newsletter sign-ups", description: "Alert when someone subscribes to email updates.", icon: Newspaper };
  }
  const meta = INBOX[formType];
  return { title: meta.title, description: `Alert when a new ${meta.title.toLowerCase()} submission arrives.`, icon: meta.icon };
}

export function NotificationSettingsView() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<NotificationSetting[]>("/api/notification-settings")
      .then(({ data }) => {
        setSettings(data);
        setDrafts(Object.fromEntries(data.map((s) => [s.formType, toDraft(s)])));
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const updateDraft = (formType: string, patch: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [formType]: { ...all[formType], ...patch } }));

  const save = async (setting: NotificationSetting) => {
    const draft = drafts[setting.formType];
    if (!draft) return;
    const recipients = parseRecipients(draft.recipients);
    const invalid = recipients.filter((email) => !EMAIL_RE.test(email));
    if (invalid.length) {
      toast.error(`Not a valid email: ${invalid.join(", ")}`);
      return;
    }
    setSavingType(setting.formType);
    try {
      const { data } = await api.put<NotificationSetting>(`/api/notification-settings/${setting.formType}`, {
        recipients,
        locale: draft.locale,
        enabled: draft.enabled,
      });
      setSettings((list) => list.map((s) => (s.formType === data.formType ? data : s)));
      setDrafts((all) => ({ ...all, [data.formType]: toDraft(data) }));
      toast.success(`${labelFor(data.formType).title} notifications saved.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingType(null);
    }
  };

  if (isDemoMode) return <DemoNotice screen="Notification settings" />;

  if (loadError) {
    return (
      <Card className="rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>
      </Card>
    );
  }

  const ordered = ORDER.map((type) => settings.find((s) => s.formType === type)).filter((s): s is NotificationSetting => Boolean(s));

  return (
    <div className="grid gap-4">
      <Card className="gap-2 rounded-[14px] border border-brand-purple-100 bg-brand-purple-50 px-5 ring-0 shadow-none">
        <p className="text-sm text-brand-purple-900">
          Each form can alert a different set of people, in the language they prefer. Visitors always receive their
          acknowledgment in their own language regardless of these settings. While no recipients are set, alerts are
          only written to the API log.
        </p>
      </Card>

      {loading
        ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-[14px]" />)
        : ordered.map((setting) => {
            const draft = drafts[setting.formType] ?? toDraft(setting);
            const meta = labelFor(setting.formType);
            const Icon = meta.icon;
            const dirty =
              draft.recipients !== setting.recipients.join("\n") ||
              draft.locale !== setting.locale ||
              draft.enabled !== setting.enabled;
            const saving = savingType === setting.formType;
            const StateIcon = draft.enabled ? BellRing : BellOff;

            return (
              <Card key={setting.formType} className="gap-4 rounded-[14px] border border-border px-5 ring-0 shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-purple-100 text-brand-purple-700">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-[0.95rem] font-bold text-brand-purple-950">{meta.title}</h2>
                      <p className="text-[0.8rem] text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-[0.8rem] font-bold text-foreground">
                    <Checkbox
                      checked={draft.enabled}
                      onCheckedChange={(checked) => updateDraft(setting.formType, { enabled: checked === true })}
                    />
                    <StateIcon className={cn("size-4", draft.enabled ? "text-brand-purple-600" : "text-muted-foreground")} />
                    {draft.enabled ? "Enabled" : "Paused"}
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`${setting.formType}-recipients`} className="text-[0.8rem] font-bold">
                      Recipients
                    </Label>
                    <Textarea
                      id={`${setting.formType}-recipients`}
                      value={draft.recipients}
                      onChange={(e) => updateDraft(setting.formType, { recipients: e.target.value })}
                      placeholder={"one address per line\nteam@example.org"}
                      className="min-h-20 rounded-[10px] bg-white font-mono text-[0.82rem]"
                      disabled={saving}
                    />
                    <p className="text-[0.74rem] text-muted-foreground">Up to 20 addresses, one per line (commas work too).</p>
                  </div>
                  <div className="grid content-start gap-1.5">
                    <Label htmlFor={`${setting.formType}-locale`} className="text-[0.8rem] font-bold">
                      Alert language
                    </Label>
                    <Select
                      value={draft.locale}
                      onValueChange={(v) => v && updateDraft(setting.formType, { locale: v as Locale })}
                      items={LOCALE_ITEMS}
                      disabled={saving}
                    >
                      <SelectTrigger id={`${setting.formType}-locale`} className="min-h-10 w-full rounded-[10px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LOCALE_LABEL) as Locale[]).map((locale) => (
                          <SelectItem key={locale} value={locale}>
                            {LOCALE_LABEL[locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[0.74rem] text-muted-foreground">Language of the staff alert email.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[0.74rem] text-muted-foreground">
                    {setting.recipients.length === 0 ? "No recipients yet" : `${setting.recipients.length} recipient${setting.recipients.length === 1 ? "" : "s"}`}
                    {" · "}updated {formatRelative(setting.updatedAt)}
                  </span>
                  <Button variant="coral" size="sm" disabled={!dirty || saving} onClick={() => save(setting)}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </Card>
            );
          })}
    </div>
  );
}
