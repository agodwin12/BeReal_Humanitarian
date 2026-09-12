"use client";

import type { ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Small building blocks shared by every public form: a labelled field with
// hint + translated error, a success/error banner, and the honeypot input.

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  full,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  /** Message key from Forms.errors (the Zod error message). */
  error?: string;
  full?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Forms");
  return (
    <div className={cn("field", full && "field--full")}>
      <Label htmlFor={id} className="field__label">
        {label}
        {optional ? <span className="optional">{t("optional")}</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

export function CheckField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  const t = useTranslations("Forms");
  return (
    <div className="field field--full">
      <div className="field field--check">
        {children}
        <Label htmlFor={id} className="field__label">
          {label}
        </Label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({
  kind,
  title,
  body,
  demo,
}: {
  kind: "success" | "error";
  title: string;
  body: string;
  demo?: boolean;
}) {
  const t = useTranslations("Forms");
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={cn("form-alert", `form-alert--${kind}`)}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon className="size-5" strokeWidth={2} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        {demo ? <p className="form-alert__demo">{t("demoNote")}</p> : null}
      </div>
    </div>
  );
}

// Bots fill every input; humans never see this one. A filled value makes the
// form "succeed" silently without sending anything.
export function Honeypot({ registration }: { registration: UseFormRegisterReturn }) {
  return (
    <div className="hp-field" aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input id="website" type="text" tabIndex={-1} autoComplete="off" {...registration} />
    </div>
  );
}
