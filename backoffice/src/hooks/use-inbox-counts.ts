"use client";

import { useEffect, useState } from "react";

import { api, isDemoMode } from "@/lib/api";
import type { InboxCounts } from "@/lib/types";

// Shared "new / total / spam per inbox" store so the sidebar badges, the
// dashboard and the inbox screens all agree, and any of them can refresh it
// after a status change without prop drilling.

type Listener = (counts: InboxCounts | null) => void;

let cache: InboxCounts | null = null;
let inFlight: Promise<InboxCounts | null> | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(cache);
}

export async function refreshInboxCounts(): Promise<InboxCounts | null> {
  if (isDemoMode) return null;
  if (!inFlight) {
    inFlight = api
      .get<InboxCounts>("/api/form-submissions/counts")
      .then(({ data }) => {
        cache = data;
        notify();
        return data;
      })
      .catch(() => cache)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useInboxCounts() {
  const [counts, setCounts] = useState<InboxCounts | null>(cache);

  useEffect(() => {
    listeners.add(setCounts);
    if (!cache) void refreshInboxCounts();
    return () => {
      listeners.delete(setCounts);
    };
  }, []);

  return counts;
}
