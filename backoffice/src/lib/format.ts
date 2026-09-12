import { format, formatDistanceToNow, isValid } from "date-fns";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy · HH:mm") : "—";
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "never";
  const date = new Date(value);
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const CURRENCY_TAG: Record<string, string> = { en: "en-US", fr: "fr-FR", es: "es-ES" };

export function formatMoney(cents: number | null | undefined, currency = "usd", locale = "en") {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat(CURRENCY_TAG[locale] ?? "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
