"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Info, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/api";
import { login, loginTwoFactor } from "@/lib/auth";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const goNext = () => {
    const next = search.get("next");
    router.replace(next && next.startsWith("/") ? next : "/");
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.status === "two_factor") {
        setChallenge(result.challengeToken);
        return;
      }
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    }
  });

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    setError(null);
    setVerifying(true);
    try {
      await loginTwoFactor(challenge, code.trim());
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is not valid.");
    } finally {
      setVerifying(false);
    }
  };

  // Distinct keys so React never reuses the email input's DOM node for the
  // code field (an uncontrolled → controlled swap would keep the typed email).
  if (challenge) {
    return (
      <form key="two-factor" onSubmit={verify} noValidate className="grid gap-4">
        <p className="flex items-start gap-2 rounded-[10px] border border-brand-purple-100 bg-brand-purple-50 px-3 py-2.5 text-[0.8rem] text-brand-purple-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Two-factor authentication is on for this account. Enter the 6-digit code from your authenticator app, or one of your recovery codes.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-code`} className="text-[0.8rem] font-bold text-brand-purple-950">
            Verification code
          </Label>
          <Input
            id={`${id}-code`}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123 456"
            className="min-h-11 rounded-[10px] bg-white text-center text-lg tracking-[0.3em]"
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="coral" size="lg" disabled={verifying || code.trim().length < 6} className="mt-1 w-full">
          {verifying ? "Verifying…" : "Verify and sign in"}
          {!verifying ? <ArrowRight className="size-4" /> : null}
        </Button>
        <button
          type="button"
          onClick={() => {
            setChallenge(null);
            setCode("");
            setError(null);
          }}
          className="text-center text-[0.8rem] font-bold text-brand-purple-700 hover:underline"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form key="password" onSubmit={onSubmit} noValidate className="grid gap-4">
      {isDemoMode ? (
        <p className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[0.8rem] text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          Demo mode — the API is not connected yet. Any email and password will sign you in as a demo Super Admin.
        </p>
      ) : null}

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

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-password`} className="text-[0.8rem] font-bold text-brand-purple-950">
          Password
        </Label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          className="min-h-11 rounded-[10px] bg-white"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-[0.76rem] font-semibold text-brand-coral-700">{errors.password.message}</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-brand-coral-100 bg-brand-coral-50 px-3 py-2.5 text-[0.82rem] font-semibold text-brand-coral-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="coral" size="lg" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>

      <p className="text-center text-[0.8rem] text-muted-foreground">
        <Link href="/forgot-password" className="font-bold text-brand-purple-700 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
