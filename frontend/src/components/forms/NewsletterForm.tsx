"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckField, Field, FormAlert, Honeypot } from "@/components/forms/FormPrimitives";
import { submitForm } from "@/lib/api";
import { newsletterSchema, type NewsletterFormValues } from "@/lib/zod-schemas/forms";

type Status = { kind: "idle" } | { kind: "success"; mocked: boolean } | { kind: "error" };

// Newsletter / Updates (brief §14): email + consent, with unsubscribe wording.
export function NewsletterForm() {
  const t = useTranslations("Forms");
  const n = useTranslations("ContactPage.newsletter");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "", consent: false, website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus({ kind: "idle" });
    if (values.website) {
      setStatus({ kind: "success", mocked: true });
      return;
    }
    try {
      const { website: _hp, ...payload } = values;
      const result = await submitForm("newsletter", payload, locale);
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
        title={n("success.title")}
        body={n("success.body")}
        demo={status.mocked}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field id={`${id}-email`} label={t("labels.email")} error={errors.email?.message} full>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>

      <CheckField id={`${id}-consent`} label={n("consent")} error={errors.consent?.message}>
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
          {isSubmitting ? t("sending") : n("submit")}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
        <p className="form-footnote">{n("unsubscribe")}</p>
      </div>
    </form>
  );
}
