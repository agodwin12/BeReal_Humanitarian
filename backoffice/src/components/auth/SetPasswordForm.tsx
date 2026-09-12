"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, isDemoMode } from "@/lib/api";
import { setSession, type SessionUser } from "@/lib/auth";

const schema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });
type Values = z.infer<typeof schema>;

// Shared by /reset-password (forgotten password) and /accept-invite (new
// staff). Both consume a one-time token from the email link and sign the
// user straight in on success.
export function SetPasswordForm({ mode }: { mode: "reset" | "invite" }) {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token");
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const endpoint = mode === "reset" ? "/api/auth/reset-password" : "/api/auth/accept-invite";
  const cta = mode === "reset" ? "Save new password" : "Activate my account";

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (isDemoMode) {
      setError("Demo mode — the API is not connected, so this link cannot be verified yet.");
      return;
    }
    try {
      const { data } = await api.post<{ token: string; user: SessionUser }>(endpoint, {
        token,
        password: values.password,
      });
      setSession(data.token, data.user);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  });

  if (!token) {
    return (
      <div className="grid gap-4">
        <p className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[0.82rem] text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          This link is missing its token. Please open the link exactly as it appears in your email.
        </p>
        <Link href="/login" className="text-center text-[0.8rem] font-bold text-brand-purple-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-password`} className="text-[0.8rem] font-bold text-brand-purple-950">
          New password
        </Label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="new-password"
          className="min-h-11 rounded-[10px] bg-white"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.password.message}</p>
        ) : (
          <p className="text-[0.74rem] text-muted-foreground">At least 10 characters.</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-confirm`} className="text-[0.8rem] font-bold text-brand-purple-950">
          Confirm password
        </Label>
        <Input
          id={`${id}-confirm`}
          type="password"
          autoComplete="new-password"
          className="min-h-11 rounded-[10px] bg-white"
          aria-invalid={!!errors.confirm}
          {...register("confirm")}
        />
        {errors.confirm ? <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.confirm.message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="coral" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Saving…" : cta}
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>
    </form>
  );
}
