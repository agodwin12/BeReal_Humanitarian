"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert, Honeypot } from "@/components/forms/FormPrimitives";
import { submitForm } from "@/lib/api";
import { contactSchema, type ContactFormValues } from "@/lib/zod-schemas/forms";

type Status = { kind: "idle" } | { kind: "success"; mocked: boolean } | { kind: "error" };

// General Contact form (brief §14): name, email, subject, message.
export function ContactForm() {
  const t = useTranslations("Forms");
  const c = useTranslations("ContactPage.form");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus({ kind: "idle" });
    if (values.website) {
      setStatus({ kind: "success", mocked: true });
      return;
    }
    try {
      const { website: _hp, ...payload } = values;
      const result = await submitForm("contact", payload, locale);
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
        title={c("success.title")}
        body={c("success.body")}
        demo={status.mocked}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form-grid">
      <Field id={`${id}-name`} label={t("labels.fullName")} error={errors.name?.message}>
        <Input id={`${id}-name`} autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field id={`${id}-email`} label={t("labels.email")} error={errors.email?.message}>
        <Input id={`${id}-email`} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field id={`${id}-subject`} label={c("subject")} error={errors.subject?.message} full>
        <Input id={`${id}-subject`} aria-invalid={!!errors.subject} {...register("subject")} />
      </Field>
      <Field id={`${id}-message`} label={t("labels.message")} error={errors.message?.message} full>
        <Textarea id={`${id}-message`} aria-invalid={!!errors.message} {...register("message")} />
      </Field>

      <Honeypot registration={register("website")} />

      {status.kind === "error" ? (
        <div className="field--full">
          <FormAlert kind="error" title={t("error.title")} body={t("error.body")} />
        </div>
      ) : null}

      <div className="form-actions">
        <Button type="submit" variant="coral" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("sending") : c("submit")}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
        <p className="form-footnote">{t("footnote")}</p>
      </div>
    </form>
  );
}
