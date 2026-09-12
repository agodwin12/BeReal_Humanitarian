"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckField, Field, FormAlert, Honeypot } from "@/components/forms/FormPrimitives";
import { submitForm } from "@/lib/api";
import { volunteerSchema, type VolunteerFormValues } from "@/lib/zod-schemas/forms";

type Status = { kind: "idle" } | { kind: "success"; mocked: boolean } | { kind: "error" };

export function VolunteerForm() {
  const t = useTranslations("Forms");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      interests: "",
      availability: "",
      ageConfirmed: false,
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
      const result = await submitForm("volunteer", payload, locale);
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
        title={t("success.volunteer.title")}
        body={t("success.volunteer.body")}
        demo={status.mocked}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field id={`${id}-fullName`} label={t("labels.fullName")} error={errors.fullName?.message}>
        <Input id={`${id}-fullName`} autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field id={`${id}-email`} label={t("labels.email")} error={errors.email?.message}>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field id={`${id}-phone`} label={t("labels.phone")} hint={t("hints.phone")} error={errors.phone?.message}>
        <Input id={`${id}-phone`} type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field id={`${id}-location`} label={t("labels.location")} hint={t("hints.location")} error={errors.location?.message}>
        <Input id={`${id}-location`} autoComplete="address-level2" aria-invalid={!!errors.location} {...register("location")} />
      </Field>
      <Field id={`${id}-interests`} label={t("labels.interests")} error={errors.interests?.message} full>
        <Textarea id={`${id}-interests`} placeholder={t("placeholders.interests")} aria-invalid={!!errors.interests} {...register("interests")} />
      </Field>
      <Field id={`${id}-availability`} label={t("labels.availability")} error={errors.availability?.message} full>
        <Input id={`${id}-availability`} placeholder={t("placeholders.availability")} aria-invalid={!!errors.availability} {...register("availability")} />
      </Field>

      <CheckField id={`${id}-age`} label={t("labels.ageConfirmed")} error={errors.ageConfirmed?.message}>
        <Controller
          control={control}
          name="ageConfirmed"
          render={({ field }) => (
            <Checkbox id={`${id}-age`} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={!!errors.ageConfirmed} />
          )}
        />
      </CheckField>
      <CheckField id={`${id}-consent`} label={t("labels.consentVolunteer")} error={errors.consent?.message}>
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
          {isSubmitting ? t("sending") : t("submit.volunteer")}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
        <p className="form-footnote">{t("footnote")}</p>
      </div>
    </form>
  );
}
