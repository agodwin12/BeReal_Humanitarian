"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bot, CheckCircle2, MessageSquareText, RefreshCw, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { ConfirmDialog } from "@/components/content/ConfirmDialog";
import { LocaleTabs } from "@/components/content/LocaleTabs";
import { LocalizedInput } from "@/components/content/LocalizedInput";
import { ApiError, api, isDemoMode } from "@/lib/api";
import { LOCALES, LOCALE_NAME, localizedFrom } from "@/lib/content";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ChatSessionDetail, ChatSessionSummary, ChatSettings, ChatStats, Locale, Localized, PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = {
  enabled: boolean;
  assistantName: string;
  welcome: Localized;
  suggestedQuestions: Record<Locale, string>;
  extraKnowledge: Localized;
  maxMessagesPerSession: number;
};

function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.errors?.length) return err.errors.map((e) => e.message).join(" ");
  return err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.";
}

const toDraft = (s: ChatSettings): Draft => ({
  enabled: s.enabled,
  assistantName: s.assistantName,
  welcome: localizedFrom(s.welcome),
  suggestedQuestions: Object.fromEntries(LOCALES.map((l) => [l, (s.suggestedQuestions?.[l] ?? []).join("\n")])) as Record<Locale, string>,
  extraKnowledge: localizedFrom(s.extraKnowledge),
  maxMessagesPerSession: s.maxMessagesPerSession,
});

const toQuery = (params: Record<string, string | number | undefined>) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
};

export function AssistantView() {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [question, setQuestion] = useState("");
  const [testLocale, setTestLocale] = useState<Locale>("en");
  const [testing, setTesting] = useState(false);
  const [answer, setAnswer] = useState<{ reply: string; model: string; latencyMs: number } | null>(null);

  const [stats, setStats] = useState<ChatStats | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [detail, setDetail] = useState<ChatSessionDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatSessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<ChatSettings>("/api/chat-settings")
      .then(({ data }) => {
        setSettings(data);
        setDraft(toDraft(data));
      })
      .catch((err) => setLoadError(errorMessage(err)));
    api
      .get<ChatStats>("/api/chat-sessions/stats")
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { data, meta: m } = await api.get<ChatSessionSummary[]>(`/api/chat-sessions${toQuery({ page, pageSize: 20 })}`);
      setSessions(data);
      setMeta(m ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingSessions(false);
    }
  }, [page]);

  useEffect(() => {
    if (isDemoMode) return;
    const handle = setTimeout(loadSessions, 0);
    return () => clearTimeout(handle);
  }, [loadSessions]);

  const patch = (partial: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...partial } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await api.put<ChatSettings>("/api/chat-settings", {
        enabled: draft.enabled,
        assistantName: draft.assistantName,
        welcome: draft.welcome,
        suggestedQuestions: Object.fromEntries(LOCALES.map((l) => [l, draft.suggestedQuestions[l].split("\n").map((q) => q.trim()).filter(Boolean)])),
        extraKnowledge: draft.extraKnowledge,
        maxMessagesPerSession: draft.maxMessagesPerSession,
      });
      setSettings(data);
      setDraft(toDraft(data));
      toast.success("Assistant settings saved. The website picks them up within about 30 seconds.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!question.trim()) return;
    setTesting(true);
    setAnswer(null);
    try {
      const { data } = await api.post<{ reply: string; model: string; latencyMs: number }>("/api/chat-settings/preview", { question: question.trim(), locale: testLocale });
      setAnswer(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const openDetail = async (session: ChatSessionSummary) => {
    try {
      const { data } = await api.get<ChatSessionDetail>(`/api/chat-sessions/${session.id}`);
      setDetail(data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/chat-sessions/${confirmDelete.id}`);
      setSessions((list) => list.filter((s) => s.id !== confirmDelete.id));
      if (detail?.id === confirmDelete.id) setDetail(null);
      toast.success("Conversation deleted.");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (isDemoMode) return <DemoNotice screen="AI assistant" />;

  if (loadError) {
    return (
      <Card className="rounded-[14px] border border-border px-5 ring-0 shadow-none">
        <p className="text-sm font-semibold text-brand-coral-700">{loadError}</p>
      </Card>
    );
  }

  const configured = settings?.gemini.configured ?? false;
  const live = Boolean(settings?.enabled && configured);

  return (
    <div className="grid gap-4">
      {/* Status */}
      <Card className="gap-3 rounded-[14px] border border-border px-5 py-4 ring-0 shadow-none">
        {!settings || !draft ? (
          <Skeleton className="h-16 w-full rounded-[10px]" />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className={cn("inline-grid size-11 place-items-center rounded-[12px]", live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-brand-purple-950">
                {live ? "The assistant is live on the website." : configured ? "The assistant is switched off." : "No Gemini key on the API — the chat bubble stays hidden."}
              </p>
              <p className="text-xs text-muted-foreground">
                Model <code className="rounded bg-muted px-1">{settings.gemini.model}</code> · key {configured ? "configured on the server" : "missing (GEMINI_API_KEY in backend/.env)"} · answers use only the published website content plus the extra knowledge below.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Checkbox checked={draft.enabled} onCheckedChange={(v) => patch({ enabled: v === true })} disabled={!configured} />
              Show the chat on the website
            </label>
            {stats ? (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{stats.sessions30d}</strong> conversations / 30 d</span>
                <span><strong className="text-foreground">{stats.messages30d}</strong> questions</span>
                <span className={cn(stats.errors30d ? "text-brand-coral-700" : "")}><strong>{stats.errors30d}</strong> errors</span>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Texts */}
      {draft ? (
        <Card className="gap-4 rounded-[14px] border border-border px-5 py-5 ring-0 shadow-none">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-brand-purple-950">What visitors see</h2>
              <p className="text-xs text-muted-foreground">Name, first message and the suggested questions under it, in the three languages.</p>
            </div>
            <LocaleTabs value={locale} onChange={setLocale} values={[draft.welcome, draft.extraKnowledge]} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="assistant-name" className="text-[0.8rem] font-bold">Assistant name</Label>
              <Input id="assistant-name" value={draft.assistantName} onChange={(e) => patch({ assistantName: e.target.value })} maxLength={80} className="rounded-[10px] bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="assistant-max" className="text-[0.8rem] font-bold">Maximum questions per conversation</Label>
              <Input id="assistant-max" type="number" min={2} max={200} value={draft.maxMessagesPerSession} onChange={(e) => patch({ maxMessagesPerSession: Number(e.target.value) })} className="rounded-[10px] bg-white" />
            </div>
          </div>
          <LocalizedInput label="Welcome message" value={draft.welcome} onChange={(v) => patch({ welcome: v })} locale={locale} multiline required hint="The first bubble. Say what the assistant can help with." />
          <div className="grid gap-1.5">
            <Label htmlFor="assistant-suggestions" className="text-[0.8rem] font-bold">Suggested questions ({LOCALE_NAME[locale]}) — one per line, up to six</Label>
            <Textarea id="assistant-suggestions" value={draft.suggestedQuestions[locale]} onChange={(e) => patch({ suggestedQuestions: { ...draft.suggestedQuestions, [locale]: e.target.value } })} className="min-h-24 rounded-[10px] bg-white" />
          </div>
          <LocalizedInput
            label="Extra knowledge"
            value={draft.extraKnowledge}
            onChange={(v) => patch({ extraKnowledge: v })}
            locale={locale}
            multiline
            maxLength={4000}
            hint="Facts the assistant may use that are not on the website yet: how to reach a chapter, a current campaign, opening hours. Keep it factual — the assistant repeats what is written here."
          />
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="rounded-[10px]">
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Test */}
      <Card className="gap-3 rounded-[14px] border border-border px-5 py-5 ring-0 shadow-none">
        <div>
          <h2 className="text-base font-bold text-brand-purple-950">Try it</h2>
          <p className="text-xs text-muted-foreground">Sends one question through the real assistant with the saved settings. Test questions are not stored as conversations.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runTest()} placeholder="e.g. How do I request assistance?" maxLength={1500} className="rounded-[10px] bg-white" disabled={!configured} />
          <Select value={testLocale} onValueChange={(v) => setTestLocale(v as Locale)}>
            <SelectTrigger className="w-full rounded-[10px] bg-white sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{LOCALES.map((l) => <SelectItem key={l} value={l}>{LOCALE_NAME[l]}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={runTest} disabled={testing || !configured || !question.trim()} className="rounded-[10px]">
            <Send className="size-4" /> {testing ? "Asking…" : "Ask"}
          </Button>
        </div>
        {answer ? (
          <div className="rounded-[12px] border border-brand-purple-100 bg-brand-purple-50 px-4 py-3 text-sm text-brand-purple-950">
            <p className="whitespace-pre-wrap">{answer.reply}</p>
            <p className="mt-2 text-[0.7rem] text-muted-foreground">{answer.model} · {answer.latencyMs} ms</p>
          </div>
        ) : null}
      </Card>

      {/* Conversations */}
      <Card className="gap-3 rounded-[14px] border border-border px-5 py-5 ring-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-brand-purple-950">Conversations</h2>
            <p className="text-xs text-muted-foreground">What visitors asked, newest first. Visitors are anonymous; delete a conversation if it contains personal details.</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-[10px]" onClick={loadSessions} disabled={loadingSessions}>
            <RefreshCw className={cn("size-4", loadingSessions && "animate-spin")} /> Refresh
          </Button>
        </div>
        {loadingSessions && sessions.length === 0 ? (
          <Skeleton className="h-32 w-full rounded-[10px]" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>First question</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => openDetail(s)}>
                    <TableCell className="whitespace-nowrap text-xs">{formatRelative(s.lastMessageAt ?? s.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{s.locale}</Badge></TableCell>
                    <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{s.page ?? "—"}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{s.preview || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{s.messageCount}</TableCell>
                    <TableCell className={cn("text-right text-sm", s.errors ? "font-bold text-brand-coral-700" : "text-muted-foreground")}>{s.errors}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Delete conversation" onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total} conversations</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-[10px]" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="rounded-[10px]" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><MessageSquareText className="size-4" /> Conversation #{detail.id}</SheetTitle>
                <SheetDescription>
                  {formatDateTime(detail.createdAt)} · {LOCALE_NAME[detail.locale] ?? detail.locale} · started on {detail.page ?? "—"}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-2 px-4 pb-6">
                {detail.messages.map((m) => (
                  <div key={m.id} className={cn("max-w-[90%] rounded-[12px] px-3 py-2 text-sm", m.role === "user" ? "self-end bg-brand-purple-700 text-white" : m.error ? "self-start border border-brand-coral-100 bg-brand-coral-50 text-brand-coral-700" : "self-start border border-border bg-white")}>
                    {m.error ? (
                      <p className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> <span>Could not answer: {m.error}</span></p>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                    <p className={cn("mt-1 text-[0.65rem]", m.role === "user" ? "text-white/70" : "text-muted-foreground")}>
                      {formatDateTime(m.createdAt)}{m.model ? ` · ${m.model}` : ""}{m.latencyMs != null ? ` · ${m.latencyMs} ms` : ""}
                    </p>
                  </div>
                ))}
                {detail.messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages.</p> : null}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Visitor identity is not stored (IP is hashed).</span>
                  <Button variant="outline" size="sm" className="rounded-[10px]" onClick={() => setConfirmDelete({ ...detail, preview: "", errors: 0 })}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this conversation?"
        description="The visitor's questions and the assistant's answers are removed permanently."
        cta="Delete"
        destructive
        busy={deleting}
        onConfirm={remove}
      />
    </div>
  );
}
