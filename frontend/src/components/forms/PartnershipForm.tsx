"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckField, Field, FormAlert, Honeypot } from "@/components/forms/FormPrimitives";
import { submitForm } from "@/lib/api";
import { ORG_TYPES, partnershipSchema, type PartnershipFormValues } from "@/lib/zod-schemas/forms";

type Status = { kind: "idle" } | { kind: "success"; mocked: boolean } | { kind: "error" };

export function PartnershipForm() {
  const t = useTranslations("Forms");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const orgTypeItems = Object.fromEntries(
    ORG_TYPES.map((value) => [value, t(`options.organizationType.${value}`)]),
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: {
      organizationName: "",
      contactName: "",
      email: "",
      phone: "",
      proposal: "",
      message: "",
      consent: false,
      website: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus({ kind: "idle" });
    if (values.website) {
      setStatus({ kind: "success", mocked: true });
      return;
    }
    try {
      const { website: _hp, ...payload } = values;
      const result = await submitForm("partnership", payload, locale);
      setStatus({ kind: "success", mocked: result.mocked });
      reset();
    } catch {
      setStatus({ kind: "error" });
    }
  });

  if (status.kind === "success") {
    return (
      <FormAlert
        kind="success"
        title={t("success.partnership.title")}
        body={t("success.partnership.body")}
        demo={status.mocked}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field id={`${id}-org`} label={t("labels.organizationName")} error={errors.organizationName?.message}>
        <Input id={`${id}-org`} autoComplete="organization" aria-invalid={!!errors.organizationName} {...register("organizationName")} />
      </Field>
      <Field id={`${id}-contact`} label={t("labels.contactName")} error={errors.contactName?.message}>
        <Input id={`${id}-contact`} autoComplete="name" aria-invalid={!!errors.contactName} {...register("contactName")} />
      </Field>
      <Field id={`${id}-email`} label={t("labels.email")} error={errors.email?.message}>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field id={`${id}-phone`} label={t("labels.phone")} hint={t("hints.phone")} error={errors.phone?.message}>
        <Input id={`${id}-phone`} type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field id={`${id}-type`} label={t("labels.organizationType")} error={errors.organizationType?.message} full>
        <Controller
          control={control}
          name="organizationType"
          render={({ field }) => (
            <Select value={field.value ?? null} onValueChange={(value) => field.onChange(value ?? undefined)} items={orgTypeItems}>
              <SelectTrigger id={`${id}-type`} aria-invalid={!!errors.organizationType}>
                <SelectValue placeholder={t("placeholders.select")} />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {orgTypeItems[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field id={`${id}-proposal`} label={t("labels.proposal")} error={errors.proposal?.message} full>
        <Input id={`${id}-proposal`} placeholder={t("placeholders.proposal")} aria-invalid={!!errors.proposal} {...register("proposal")} />
      </Field>
      <Field id={`${id}-message`} label={t("labels.message")} error={errors.message?.message} full>
        <Textarea id={`${id}-message`} aria-invalid={!!errors.message} {...register("message")} />
      </Field>

      <CheckField id={`${id}-consent`} label={t("labels.consentPartner")} error={errors.consent?.message}>
        <Controller
          control={control}
          name="consent"
          render={({ field }) => (
            <Checkbox id={`${id}-consent`} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={!!errors.consent} />
          )}
        />
      </CheckField>

      <Honeypot registration={register("website")} />

      {status.kind === "error" ? (
        <div className="field--full">
          <FormAlert kind="error" title={t("error.title")} body={t("error.body")} />
        </div>
      ) : null}

      <div className="form-actions">
        <Button type="submit" variant="coral" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("sending") : t("submit.partnership")}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
        <p className="form-footnote">{t("footnote")}</p>
      </div>
    </form>
  );
}
