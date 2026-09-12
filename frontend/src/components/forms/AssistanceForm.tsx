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
import { Link } from "@/i18n/navigation";
import { submitForm } from "@/lib/api";
import {
  ASSISTANCE_TYPES,
  CONTACT_METHODS,
  URGENCY_LEVELS,
  assistanceSchema,
  type AssistanceFormValues,
} from "@/lib/zod-schemas/forms";

type Status = { kind: "idle" } | { kind: "success"; mocked: boolean } | { kind: "error" };

export function AssistanceForm() {
  const t = useTranslations("Forms");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const itemsFor = <T extends readonly string[]>(group: string, values: T) =>
    Object.fromEntries(values.map((value) => [value, t(`options.${group}.${value}`)]));

  const contactItems = itemsFor("preferredContact", CONTACT_METHODS);
  const typeItems = itemsFor("assistanceType", ASSISTANCE_TYPES);
  const urgencyItems = itemsFor("urgency", URGENCY_LEVELS);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      needDescription: "",
      deadline: "",
      consent: false,
      privacyAcknowledged: false,
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
      const result = await submitForm("assistance", payload, locale);
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
        title={t("success.assistance.title")}
        body={t("success.assistance.body")}
        demo={status.mocked}
      />
    );
  }

  const selectField = (
    name: "preferredContact" | "assistanceType" | "urgency",
    fieldId: string,
    values: readonly string[],
    items: Record<string, string>,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value ?? null} onValueChange={(value) => field.onChange(value ?? undefined)} items={items}>
          <SelectTrigger id={fieldId} aria-invalid={!!errors[name]}>
            <SelectValue placeholder={t("placeholders.select")} />
          </SelectTrigger>
          <SelectContent>
            {values.map((value) => (
              <SelectItem key={value} value={value}>
                {items[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field id={`${id}-fullName`} label={t("labels.fullName")} error={errors.fullName?.message} full>
        <Input id={`${id}-fullName`} autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field id={`${id}-email`} label={t("labels.email")} error={errors.email?.message}>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field id={`${id}-phone`} label={t("labels.phone")} hint={t("hints.phone")} error={errors.phone?.message}>
        <Input id={`${id}-phone`} type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field id={`${id}-city`} label={t("labels.city")} error={errors.city?.message}>
        <Input id={`${id}-city`} autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
      </Field>
      <Field id={`${id}-state`} label={t("labels.state")} error={errors.state?.message}>
        <Input id={`${id}-state`} autoComplete="address-level1" aria-invalid={!!errors.state} {...register("state")} />
      </Field>
      <Field id={`${id}-country`} label={t("labels.country")} error={errors.country?.message}>
        <Input id={`${id}-country`} autoComplete="country-name" aria-invalid={!!errors.country} {...register("country")} />
      </Field>
      <Field id={`${id}-contact`} label={t("labels.preferredContact")} error={errors.preferredContact?.message}>
        {selectField("preferredContact", `${id}-contact`, CONTACT_METHODS, contactItems)}
      </Field>
      <Field id={`${id}-type`} label={t("labels.assistanceType")} error={errors.assistanceType?.message}>
        {selectField("assistanceType", `${id}-type`, ASSISTANCE_TYPES, typeItems)}
      </Field>
      <Field id={`${id}-urgency`} label={t("labels.urgency")} error={errors.urgency?.message}>
        {selectField("urgency", `${id}-urgency`, URGENCY_LEVELS, urgencyItems)}
      </Field>
      <Field id={`${id}-need`} label={t("labels.needDescription")} hint={t("hints.needDescription")} error={errors.needDescription?.message} full>
        <Textarea id={`${id}-need`} aria-invalid={!!errors.needDescription} {...register("needDescription")} />
      </Field>
      <Field id={`${id}-deadline`} label={t("labels.deadline")} hint={t("hints.deadline")} error={errors.deadline?.message} optional full>
        <Input id={`${id}-deadline`} {...register("deadline")} />
      </Field>

      <CheckField id={`${id}-consent`} label={t("labels.consentAssistance")} error={errors.consent?.message}>
        <Controller
          control={control}
          name="consent"
          render={({ field }) => (
            <Checkbox id={`${id}-consent`} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={!!errors.consent} />
          )}
        />
      </CheckField>
      <CheckField
        id={`${id}-privacy`}
        label={t.rich("labels.privacyAck", {
          link: (chunks) => <Link href="/privacy-policy">{chunks}</Link>,
        })}
        error={errors.privacyAcknowledged?.message}
      >
        <Controller
          control={control}
          name="privacyAcknowledged"
          render={({ field }) => (
            <Checkbox id={`${id}-privacy`} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={!!errors.privacyAcknowledged} />
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
          {isSubmitting ? t("sending") : t("submit.assistance")}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
        <p className="form-footnote">{t("footnoteAssistance")}</p>
      </div>
    </form>
  );
}
