"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useInboxCounts } from "@/hooks/use-inbox-counts";
import { api, isDemoMode } from "@/lib/api";
import { FORM_TYPES, INBOX } from "@/lib/formFields";
import { cn } from "@/lib/utils";

// Dashboard panel: new / total per inbox plus the subscriber count. Inboxes
// the signed-in role cannot open (Request Assistance for non-Super Admins)
// are simply absent from the API's counts and therefore from this list.
export function InboxSummary() {
  const counts = useInboxCounts();
  const [subscribers, setSubscribers] = useState<number | null>(null);

  useEffect(() => {
    if (isDemoMode) return;
    api
      .get<{ subscribed: number }>("/api/newsletter/subscribers/counts")
      .then(({ data }) => setSubscribers(data.subscribed))
      .catch(() => setSubscribers(null));
  }, []);

  const visibleTypes = counts ? FORM_TYPES.filter((type) => counts[type]) : FORM_TYPES;

  return (
    <ul className="grid gap-1.5">
      {visibleTypes.map((type) => {
        const count = counts?.[type];
        const fresh = count?.new ?? 0;
        return (
          <li key={type}>
            <Link
              href={`/inbox/${type}`}
              className="flex items-center justify-between rounded-[10px] px-3 py-2 text-sm font-semibold text-foreground hover:bg-brand-purple-50"
            >
              {INBOX[type].title}
              <span className="flex items-center gap-2">
                {count ? <span className="text-[0.7rem] text-muted-foreground">{count.total} total</span> : null}
                <span
                  className={cn(
                    "rounded-[6px] px-2 py-0.5 text-[0.7rem] font-bold tabular-nums",
                    fresh > 0 ? "bg-brand-coral-500 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count ? `${fresh} new` : "—"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link
          href="/inbox/newsletter"
          className="flex items-center justify-between rounded-[10px] px-3 py-2 text-sm font-semibold text-foreground hover:bg-brand-purple-50"
        >
          Newsletter subscribers
          <span className="rounded-[6px] bg-muted px-2 py-0.5 text-[0.7rem] font-bold text-muted-foreground tabular-nums">
            {subscribers === null ? "—" : `${subscribers} subscribed`}
          </span>
        </Link>
      </li>
    </ul>
  );
}
