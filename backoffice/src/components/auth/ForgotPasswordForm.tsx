"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, isDemoMode } from "@/lib/api";

const schema = z.object({ email: z.email("Enter a valid email address.") });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const id = useId();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (isDemoMode) {
      setSent(true);
      return;
    }
    try {
      await api.post("/api/auth/forgot-password", values);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  });

  if (sent) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[0.85rem] text-emerald-800">
          <MailCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            If an account exists for that email, a reset link is on its way. It is valid for 2 hours.
            {isDemoMode ? " (Demo mode — nothing was sent.)" : ""}
          </p>
        </div>
        <Link href="/login" className="text-center text-[0.8rem] font-bold text-brand-purple-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`} className="text-[0.8rem] font-bold text-brand-purple-950">
          Email
        </Label>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          className="min-h-11 rounded-[10px] bg-white"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email ? <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.email.message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="coral" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Sending…" : "Send reset link"}
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>

      <Link href="/login" className="text-center text-[0.8rem] font-bold text-brand-purple-700 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
