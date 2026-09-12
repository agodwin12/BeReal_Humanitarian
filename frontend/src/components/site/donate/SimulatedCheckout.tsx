"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { getDonationStatus, simulateDonation, type DonationStatus } from "@/lib/api";

const LOCALE_TAG: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };

// Stands in for Stripe's hosted page while no keys are configured (local
// review only — the API refuses these calls as soon as real keys exist).
export function SimulatedCheckout({ session }: { session: string }) {
  const t = useTranslations("DonatePage.simulate");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const [busy, setBusy] = useState<"paid" | "cancel" | null>(null);

  useEffect(() => {
    getDonationStatus(session).then(setStatus).catch(() => setStatus(null));
  }, [session]);

  const act = async (outcome: "paid" | "cancel") => {
    setBusy(outcome);
    try {
      await simulateDonation(session, outcome);
      if (outcome === "paid") router.push(`/donate/thank-you?session=${encodeURIComponent(session)}`);
      else router.push("/donate?cancelled=1");
    } finally {
      setBusy(null);
    }
  };

  const amount = status ? new Intl.NumberFormat(LOCALE_TAG[locale] ?? "en-US", { style: "currency", currency: status.currency.toUpperCase() }).format(status.amountCents / 100) : "…";

  return (
    <div className="thankyou-card">
      <div className="callout-coral mb-4">
        <FlaskConical className="size-5" strokeWidth={2} />
        <div>
          <strong>{t("title")}</strong>
          <p>{t("body")}</p>
        </div>
      </div>
      <dl className="receipt-box">
        <div>
          <dt>{t("amount")}</dt>
          <dd className="text-2xl font-bold text-brand-purple-950">{amount}</dd>
        </div>
        <div>
          <dt>{t("donor")}</dt>
          <dd>{status ? `${status.donorName} · ${status.donorEmail}` : "…"}</dd>
        </div>
      </dl>
      <div className="form-actions">
        <Button type="button" variant="coral" size="lg" disabled={!status || busy !== null} onClick={() => act("paid")}>
          <CreditCard className="size-4" />
          {busy === "paid" ? t("processing") : t("pay", { amount })}
        </Button>
        <Button type="button" variant="outline-purple" size="lg" disabled={busy !== null} onClick={() => act("cancel")}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
