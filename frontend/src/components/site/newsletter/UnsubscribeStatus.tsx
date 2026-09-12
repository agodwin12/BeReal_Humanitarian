"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/forms/FormPrimitives";
import { Link } from "@/i18n/navigation";
import { unsubscribeNewsletter } from "@/lib/api";

type State = { kind: "pending" } | { kind: "done"; email: string | null } | { kind: "invalid" } | { kind: "error" };

// One-click unsubscribe target for the link in every newsletter email
// (brief §14). The token is single-purpose and only ever identifies one
// subscriber; nothing is stored on this page.
export function UnsubscribeStatus({ token }: { token: string | null }) {
  const t = useTranslations("Unsubscribe");
  const [state, setState] = useState<State>(token ? { kind: "pending" } : { kind: "invalid" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    unsubscribeNewsletter(token)
      .then((result) => {
        if (cancelled) return;
        setState(result.unsubscribed ? { kind: "done", email: result.email ?? null } : { kind: "invalid" });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="form-card">
      {state.kind === "pending" ? (
        <p className="lead" role="status">
          {t("pending")}
        </p>
      ) : state.kind === "done" ? (
        <FormAlert kind="success" title={t("done.title")} body={state.email ? t("done.bodyWithEmail", { email: state.email }) : t("done.body")} />
      ) : state.kind === "invalid" ? (
        <FormAlert kind="error" title={t("invalid.title")} body={t("invalid.body")} />
      ) : (
        <FormAlert kind="error" title={t("error.title")} body={t("error.body")} />
      )}
      <div className="form-actions">
        <Button asChild variant="purple" size="lg">
          <Link href="/">
            {t("backHome")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
