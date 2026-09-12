"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/forms/FormPrimitives";
import { Link } from "@/i18n/navigation";
import { getDonationStatus, type DonationStatus } from "@/lib/api";

const LOCALE_TAG: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };

// Polls until the webhook (or the simulator) has confirmed the payment, then
// shows the receipt line — the printable thank-you page from the brief.
export function ThankYou({ session, message }: { session: string | null; message: string }) {
  const t = useTranslations("DonatePage.thankYou");
  const locale = useLocale();
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!session) {
      setError(true);
      return;
    }
    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const data = await getDonationStatus(session);
        if (cancelled) return;
        setStatus(data);
        if (data.status === "pending" && attempts < 40) {
          attempts += 1;
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [session]);

  const paid = status && ["paid", "partially_refunded", "refunded"].includes(status.status);
  const failed = error || (status && ["failed", "expired"].includes(status.status));
  const amount = status ? new Intl.NumberFormat(LOCALE_TAG[locale] ?? "en-US", { style: "currency", currency: status.currency.toUpperCase() }).format(status.amountCents / 100) : "";

  return (
    <div className="thankyou-card">
      {failed ? (
        <>
          <FormAlert kind="error" title={t("failed.title")} body={t("failed.body")} />
          <div className="form-actions">
            <Button asChild variant="purple" size="lg">
              <Link href="/donate">
                {t("again")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </>
      ) : !paid ? (
        <div className="thankyou-pending" role="status">
          <span className="thankyou-spinner" aria-hidden="true" />
          <div>
            <strong>{t("pending")}</strong>
            <p>{t("pendingHint")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="thankyou-head">
            <CheckCircle2 className="size-7 text-emerald-600" strokeWidth={2} />
            <p className="lead">{message}</p>
          </div>
          <dl className="receipt-box">
            <div>
              <dt>{t("receipt", { number: status!.receiptNumber ?? "—", amount })}</dt>
              <dd>{t("emailed", { email: status!.donorEmail })}</dd>
            </div>
          </dl>
          {status!.mode !== "live" ? <p className="note-muted">Test mode — no real payment was taken.</p> : null}
          <div className="form-actions no-print">
            <Button type="button" variant="outline-purple" size="lg" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t("print")}
            </Button>
            <Button asChild variant="purple" size="lg">
              <Link href="/">
                {t("backHome")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
