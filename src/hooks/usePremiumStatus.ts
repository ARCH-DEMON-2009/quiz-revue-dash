import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
  daysLeft: number;
  source: "user_id" | "email" | "edge" | "none";
  plan: string | null;
}

const PREMIUM_KEY = ["premium-status"] as const;

async function fetchPremiumStatus(): Promise<PremiumStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { isPremium: false, expiresAt: null, daysLeft: 0, source: "none", plan: null };
  }

  const nowIso = new Date().toISOString();

  // 1. Check by user_id (active + not expired)
  const { data: byId } = await supabase
    .from("premium_users")
    .select("expiry_date, status, plan_duration_type")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expiry_date", nowIso)
    .order("expiry_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byId) {
    return buildStatus(byId.expiry_date, byId.plan_duration_type, "user_id");
  }

  // 2. Check by email (covers legacy rows where user_id wasn't linked)
  if (user.email) {
    const { data: byEmail } = await supabase
      .from("premium_users")
      .select("expiry_date, status, plan_duration_type")
      .eq("email", user.email)
      .eq("status", "active")
      .gt("expiry_date", nowIso)
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmail) {
      return buildStatus(byEmail.expiry_date, byEmail.plan_duration_type, "email");
    }
  }

  // 3. Server-side fallback (handles RLS edge cases / stale tokens)
  try {
    const { data, error } = await supabase.functions.invoke("check-premium");
    if (!error && data?.isPremium && data?.expiresAt) {
      return buildStatus(data.expiresAt, data.plan ?? null, "edge");
    }
  } catch (e) {
    // ignore; treat as not premium
  }

  return { isPremium: false, expiresAt: null, daysLeft: 0, source: "none", plan: null };
}

function buildStatus(expiry: string, plan: string | null, source: PremiumStatus["source"]): PremiumStatus {
  const expDate = new Date(expiry);
  const daysLeft = Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / 86400000));
  return { isPremium: expDate.getTime() > Date.now(), expiresAt: expiry, daysLeft, source, plan };
}

export function usePremiumStatus() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        qc.invalidateQueries({ queryKey: PREMIUM_KEY });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const q = useQuery({
    queryKey: PREMIUM_KEY,
    queryFn: fetchPremiumStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    isPremium: q.data?.isPremium ?? false,
    expiresAt: q.data?.expiresAt ?? null,
    daysLeft: q.data?.daysLeft ?? 0,
    source: q.data?.source ?? "none",
    plan: q.data?.plan ?? null,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}

export function invalidatePremiumStatus(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: PREMIUM_KEY });
}
