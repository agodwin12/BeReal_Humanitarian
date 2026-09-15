"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { ArrowRight, CalendarHeart, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckField, Field, FormAlert, Honeypot } from "@/components/forms/FormPrimitives";
import { startDonation, type DonationFrequency } from "@/lib/api";
import type { DonationConfig } from "@/lib/cms";
import { cn } from "@/lib/utils";

const LOCALE_TAG: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };

function money(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(LOCALE_TAG[locale] ?? "en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

// Same gross-up as the API: after Stripe takes percent + fixed, the organization
// keeps the gift the donor chose. Only shown when the option is switched on.
function feeCoverFor(baseCents: number, config: DonationConfig["feeCover"]) {
  const pct = Math.max(0, config.percentBp) / 10000;
  if (pct >= 1) return 0;
  return Math.max(0, Math.ceil((baseCents + Math.max(0, config.fixedCents)) / (1 - pct)) - baseCents);
}

// One-time or monthly gift: frequency, amount chips + custom amount, optional
// fee cover, name, email, then straight to Stripe's hosted page. No card field
// ever renders here (SAQ-A).
export function DonateForm({ config, cancelled = false }: { config: DonationConfig; cancelled?: boolean }) {
  const t = useTranslations("DonatePage");
  const tf = useTranslations("Forms");
  const locale = useLocale();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [frequency, setFrequency] = useState<DonationFrequency>("one_time");
  const [custom, setCustom] = useState(false);

  // The custom-amount field is display:none until "Other" is chosen, so
  // focusing it in the same click that reveals it is a no-op (the browser
  // won't focus a hidden element) — the focus has to wait for that re-render.
  useEffect(() => {
    if (custom) document.getElementById(`${id}-amount`)?.focus();
  }, [custom, id]);

  const monthlyAvailable = config.monthly.enabled && config.monthly.suggestedAmounts.length > 0;
  const chips = frequency === "monthly" && monthlyAvailable ? config.monthly.suggestedAmounts : config.suggestedAmounts;
  const min = config.minimumAmountCents;
  const max = config.maximumAmountCents;
  const fmt = (cents: number) => money(cents, config.currency, locale);

  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .trim()
          .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "amount")
          .refine((v) => Math.round(Number(v.replace(",", ".")) * 100) >= min, "minimum")
          .refine((v) => Math.round(Number(v.replace(",", ".")) * 100) <= max, "maximum"),
        name: z.string().trim().min(2, "required"),
        email: z.email("email"),
        anonymous: z.boolean(),
        coverFees: z.boolean(),
        message: z.string().trim().max(1000).optional(),
        website: z.string().optional(),
      }),
    [min, max],
  );
  type Values = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: String(config.suggestedAmounts[1] ?? config.suggestedAmounts[0] ?? 50),
      name: "",
      email: "",
      anonymous: false,
      coverFees: config.feeCover.enabled && config.feeCover.defaultChecked,
      message: "",
      website: "",
    },
  });

  const amountValue = watch("amount");
  const coverFees = watch("coverFees");
  const amountCents = /^\d+([.,]\d{1,2})?$/.test(amountValue?.trim() ?? "") ? Math.round(Number(amountValue.replace(",", ".")) * 100) : null;
  const activeChip = chips.find((a) => a * 100 === amountCents) ?? null;
  const feeCoverCents = config.feeCover.enabled && amountCents ? feeCoverFor(amountCents, config.feeCover) : 0;
  const totalCents = amountCents ? amountCents + (coverFees ? feeCoverCents : 0) : null;

  const amountError = errors.amount?.message === "minimum" ? t("form.errors.minimum", { amount: fmt(min) }) : errors.amount?.message === "maximum" ? t("form.errors.maximum", { amount: fmt(max) }) : errors.amount ? t("form.errors.amount") : null;

  const chooseFrequency = (next: DonationFrequency) => {
    setFrequency(next);
    setCustom(false);
    const list = next === "monthly" ? config.monthly.suggestedAmounts : config.suggestedAmounts;
    setValue("amount", String(list[1] ?? list[0] ?? 25), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (values.website) return; // honeypot
    setRedirecting(true);
    try {
      const { url } = await startDonation({
        amountCents: Math.round(Number(values.amount.replace(",", ".")) * 100),
        frequency: monthlyAvailable ? frequency : "one_time",
        coverFees: config.feeCover.enabled && values.coverFees,
        name: values.name,
        email: values.email,
        locale,
        anonymous: values.anonymous,
        message: values.message || undefined,
      });
      window.location.assign(url);
    } catch (err) {
      setRedirecting(false);
      setError(err instanceof Error && err.message && !/status \d+/.test(err.message) ? err.message : t("form.errors.start"));
    }
  });

  const submitLabel = () => {
    if (redirecting) return t("form.redirecting");
    if (!totalCents || !amountCents || amountCents < min) return t("form.submitPlain");
    return frequency === "monthly" && monthlyAvailable ? t("form.submitMonthly", { amount: fmt(totalCents) }) : t("form.submit", { amount: fmt(totalCents) });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      {cancelled ? (
        <div className="field--full">
          <FormAlert kind="error" title={t("cancelled.title")} body={t("cancelled.body")} />
        </div>
      ) : null}

      {monthlyAvailable ? (
        <div className="field field--full">
          <span className="field__label">{t("form.frequencyLabel")}</span>
          <div className="frequency-toggle" role="group" aria-label={t("form.frequencyLabel")}>
            <button type="button" className={cn("frequency-toggle__option", frequency === "one_time" && "is-active")} onClick={() => chooseFrequency("one_time")} aria-pressed={frequency === "one_time"}>
              {t("form.oneTime")}
            </button>
            <button type="button" className={cn("frequency-toggle__option", frequency === "monthly" && "is-active")} onClick={() => chooseFrequency("monthly")} aria-pressed={frequency === "monthly"}>
              <CalendarHeart className="size-4" aria-hidden="true" />
              {t("form.monthly")}
            </button>
          </div>
          {frequency === "monthly" ? <p className="field__hint">{t("form.monthlyHint")}</p> : null}
        </div>
      ) : null}

      <div className="field field--full">
        <span className="field__label">{frequency === "monthly" && monthlyAvailable ? t("form.monthlyAmountLabel") : t("form.amountLabel")}</span>
        <div className="amount-grid" role="group" aria-label={t("form.amountLabel")}>
          {chips.map((amount) => (
            <button
              key={`${frequency}-${amount}`}
              type="button"
              className={cn("amount-chip", activeChip === amount && !custom && "is-active")}
              onClick={() => {
                setCustom(false);
                setValue("amount", String(amount), { shouldValidate: true });
              }}
              aria-pressed={activeChip === amount && !custom}
            >
              {fmt(amount * 100)}
              {frequency === "monthly" && monthlyAvailable ? <span className="amount-chip__suffix">{t("form.perMonth")}</span> : null}
            </button>
          ))}
          <button
            type="button"
            className={cn("amount-chip", custom && "is-active")}
            onClick={() => {
              setCustom(true);
              setValue("amount", "", { shouldValidate: false });
            }}
            aria-pressed={custom}
          >
            {t("form.otherAmount")}
          </button>
        </div>
        <div className={cn("amount-custom", !custom && "amount-custom--hidden")}>
          <span className="amount-custom__symbol" aria-hidden="true">
            $
          </span>
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            placeholder={t("form.customPlaceholder")}
            aria-label={t("form.amountLabel")}
            aria-invalid={!!errors.amount}
            {...register("amount", { onChange: () => setCustom(true) })}
          />
        </div>
        <p className="field__hint">{t("form.minimum", { amount: fmt(min) })}</p>
        {amountError ? (
          <p className="field__error" role="alert">
            {amountError}
          </p>
        ) : null}
      </div>

      {config.feeCover.enabled ? (
        <CheckField id={`${id}-fees`} label={amountCents && amountCents >= min ? t("form.feeCoverLabel", { fee: fmt(feeCoverCents), amount: fmt(amountCents) }) : t("form.feeCoverLabelPlain")}>
          <Controller control={control} name="coverFees" render={({ field }) => <Checkbox id={`${id}-fees`} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />} />
        </CheckField>
      ) : null}

      <Field id={`${id}-name`} label={t("form.nameLabel")} error={errors.name?.message}>
        <Input id={`${id}-name`} autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field id={`${id}-email`} label={t("form.emailLabel")} error={errors.email?.message}>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>

      <Field id={`${id}-message`} label={t("form.messageLabel")} full>
        <Textarea id={`${id}-message`} rows={3} placeholder={t("form.messagePlaceholder")} {...register("message")} />
      </Field>

      <CheckField id={`${id}-anon`} label={t("form.anonymous")}>
        <Controller control={control} name="anonymous" render={({ field }) => <Checkbox id={`${id}-anon`} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />} />
      </CheckField>

      <Honeypot registration={register("website")} />

      {error ? (
        <div className="field--full">
          <FormAlert kind="error" title={tf("error.title")} body={error} />
        </div>
      ) : null}

      <div className="form-actions">
        <Button type="submit" variant="coral" size="lg" disabled={isSubmitting || redirecting}>
          {submitLabel()}
          {!redirecting ? <ArrowRight className="size-4" /> : null}
        </Button>
        {coverFees && config.feeCover.enabled && amountCents && amountCents >= min ? <p className="form-footnote">{t("form.totalWithFees", { amount: fmt(amountCents), fee: fmt(feeCoverCents), total: fmt(totalCents ?? amountCents) })}</p> : null}
        <p className="form-footnote flex items-start gap-2">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span>{t("form.secure")}</span>
        </p>
        <p className="form-footnote flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>{config.feeCover.enabled ? t("form.feesOptional") : t("form.fees")}</span>
        </p>
        {frequency === "monthly" && monthlyAvailable ? <p className="form-footnote">{t("form.monthlyCancel")}</p> : null}
        {config.mode !== "live" ? <p className="form-footnote font-bold text-amber-700">{t("form.testMode")}</p> : null}
      </div>
    </form>
  );
}
