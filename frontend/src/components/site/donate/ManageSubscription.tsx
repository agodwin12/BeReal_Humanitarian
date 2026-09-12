"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarHeart, CreditCard, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/forms/FormPrimitives";
import { Link } from "@/i18n/navigation";
import { cancelSubscription, getSubscription, subscriptionPortal, type PublicSubscription } from "@/lib/api";

const LOCALE_TAG: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };

// Donor self-service page for a monthly gift, reached from the private link in
// every monthly receipt: status, next charge, cancel, and (Stripe) card update.
export function ManageSubscription({ token }: { token: string | null }) {
  const t = useTranslations("DonatePage.manage");
  const locale = useLocale();
  const format = useFormatter();
  const [sub, setSub] = useState<PublicSubscription | null>(null);
  const [invalid, setInvalid] = useState(!token);
  const [busy, setBusy] = useState<"cancel" | "portal" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getSubscription(token)
      .then(setSub)
      .catch(() => setInvalid(true));
  }, [token]);

  const money = (cents: number) => (sub ? new Intl.NumberFormat(LOCALE_TAG[locale] ?? "en-US", { style: "currency", currency: sub.currency.toUpperCase() }).format(cents / 100) : "");
  const date = (value: string | null) => (value ? format.dateTime(new Date(value), { dateStyle: "long" }) : "—");

  const doCancel = async () => {
    if (!token) return;
    setBusy("cancel");
    setError(null);
    try {
      setSub(await cancelSubscription(token));
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    if (!token) return;
    setBusy("portal");
    setError(null);
    try {
      const { url } = await subscriptionPortal(token);
      window.location.assign(url);
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : t("error"));
    }
  };

  if (invalid) {
    return (
      <div className="thankyou-card">
        <FormAlert kind="error" title={t("invalid.title")} body={t("invalid.body")} />
        <div className="form-actions">
          <Button asChild variant="purple" size="lg">
            <Link href="/contact">
              {t("contact")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="thankyou-card">
        <div className="thankyou-pending" role="status">
          <span className="thankyou-spinner" aria-hidden="true" />
          <div>
            <strong>{t("loading")}</strong>
          </div>
        </div>
      </div>
    );
  }

  const open = sub.status === "active" || sub.status === "past_due";

  return (
    <div className="thankyou-card">
      <div className="thankyou-head">
        {sub.status === "canceled" ? <XCircle className="size-7 text-muted-foreground" strokeWidth={2} /> : <CalendarHeart className="size-7 text-brand-purple-600" strokeWidth={2} />}
        <p className="lead">{t(`status.${sub.status}`, { amount: money(sub.amountCents) })}</p>
      </div>
      <dl className="receipt-box">
        <div>
          <dt>{t("amount")}</dt>
          <dd className="text-xl font-bold text-brand-purple-950">
            {money(sub.amountCents)} {t("perMonth")}
          </dd>
        </div>
        <div>
          <dt>{t("donor")}</dt>
          <dd>
            {sub.donorName} · {sub.donorEmail}
          </dd>
        </div>
        <div>
          <dt>{t("since")}</dt>
          <dd>
            {date(sub.startedAt)} · {t("payments", { count: sub.paymentsCount })}
          </dd>
        </div>
        {open ? (
          <div>
            <dt>{t("nextCharge")}</dt>
            <dd>{date(sub.currentPeriodEnd)}</dd>
          </div>
        ) : null}
        {sub.status === "canceled" ? (
          <div>
            <dt>{t("canceledOn")}</dt>
            <dd>{date(sub.canceledAt)}</dd>
          </div>
        ) : null}
      </dl>

      {sub.mode !== "live" ? <p className="note-muted">Test mode — no real payment is taken.</p> : null}
      {error ? <FormAlert kind="error" title={t("error")} body={error} /> : null}

      {open ? (
        <div className="form-actions no-print">
          {sub.portalAvailable ? (
            <Button type="button" variant="outline-purple" size="lg" disabled={busy !== null} onClick={openPortal}>
              <CreditCard className="size-4" />
              {busy === "portal" ? t("opening") : t("portal")}
            </Button>
          ) : null}
          {!confirming ? (
            <Button type="button" variant="outline" size="lg" disabled={busy !== null} onClick={() => setConfirming(true)}>
              {t("cancelButton")}
            </Button>
          ) : (
            <div className="info-card border-line field--full">
              <p className="m-0 mb-3 font-semibold text-brand-purple-950">{t("cancelConfirm", { amount: money(sub.amountCents) })}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="coral" size="lg" disabled={busy !== null} onClick={doCancel}>
                  {busy === "cancel" ? t("cancelling") : t("cancelYes")}
                </Button>
                <Button type="button" variant="outline-purple" size="lg" disabled={busy !== null} onClick={() => setConfirming(false)}>
                  {t("cancelNo")}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="form-actions no-print">
          <p className="note-muted">{sub.status === "canceled" ? t("canceled.body") : t("notActive")}</p>
          <Button asChild variant="purple" size="lg">
            <Link href="/donate">
              {t("giveAgain")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
