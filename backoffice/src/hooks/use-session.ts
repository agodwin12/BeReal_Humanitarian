"use client";

import { useEffect, useState } from "react";

import { getSessionUser, type SessionUser } from "@/lib/auth";

// The signed-in user, read from localStorage after mount (never during SSR).
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    setUser(getSessionUser());
  }, []);
  return user;
}
