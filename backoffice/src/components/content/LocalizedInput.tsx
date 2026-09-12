"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocaleDots } from "@/components/content/LocaleTabs";
import { LOCALE_NAME } from "@/lib/content";
import type { Locale, Localized, LocalizedList } from "@/lib/types";

// One localized text field: edits the active language, shows which languages
// are filled. Pair with <LocaleTabs> at the top of the form.
export function LocalizedInput({
  label,
  value,
  onChange,
  locale,
  multiline = false,
  hint,
  placeholder,
  disabled,
  maxLength,
  required,
}: {
  label: string;
  value: Localized;
  onChange: (next: Localized) => void;
  locale: Locale;
  multiline?: boolean;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  required?: boolean;
}) {
  const id = useId();
  const current = value[locale] ?? "";
  const update = (text: string) => onChange({ ...value, [locale]: text });
  const common = {
    id,
    value: current,
    disabled,
    maxLength,
    placeholder: placeholder ?? `${label} (${LOCALE_NAME[locale]})`,
    "aria-required": required,
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8rem] font-bold">
          {label}
          {required ? <span className="ml-0.5 text-brand-coral-700">*</span> : null}
        </Label>
        <LocaleDots value={value} />
      </div>
      {multiline ? (
        <Textarea {...common} onChange={(e) => update(e.target.value)} className="min-h-24 rounded-[10px] bg-white" />
      ) : (
        <Input {...common} onChange={(e) => update(e.target.value)} className="min-h-10 rounded-[10px] bg-white" />
      )}
      {hint ? <p className="text-[0.74rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// A localized list (one item per line) — e.g. a program's focus items.
export function LocalizedListInput({
  label,
  value,
  onChange,
  locale,
  hint,
  disabled,
}: {
  label: string;
  value: LocalizedList;
  onChange: (next: LocalizedList) => void;
  locale: Locale;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const text = (value[locale] ?? []).join("\n");
  const asLocalized: Localized = { en: (value.en ?? []).join("\n"), fr: (value.fr ?? []).join("\n"), es: (value.es ?? []).join("\n") };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8rem] font-bold">
          {label}
        </Label>
        <LocaleDots value={asLocalized} />
      </div>
      <Textarea
        id={id}
        value={text}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, [locale]: e.target.value.split("\n") })}
        onBlur={(e) => onChange({ ...value, [locale]: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
        placeholder={`One item per line (${LOCALE_NAME[locale]})`}
        className="min-h-28 rounded-[10px] bg-white"
      />
      {hint ? <p className="text-[0.74rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
