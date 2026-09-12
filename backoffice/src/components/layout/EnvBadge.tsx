import { cn } from "@/lib/utils";

// Permanently visible TEST / LIVE indicator (scope §4.14) so nobody confuses
// Stripe test donations with real ones. Driven by NEXT_PUBLIC_STRIPE_MODE.
export function EnvBadge() {
  const mode = process.env.NEXT_PUBLIC_STRIPE_MODE === "live" ? "live" : "test";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-[0.68rem] font-extrabold tracking-[0.14em] uppercase",
        mode === "live"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
      title={mode === "live" ? "Stripe live mode — real money" : "Stripe test mode — no real charges"}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          mode === "live" ? "bg-emerald-500" : "bg-amber-500",
        )}
        aria-hidden="true"
      />
      {mode === "live" ? "Live" : "Test mode"}
    </span>
  );
}
