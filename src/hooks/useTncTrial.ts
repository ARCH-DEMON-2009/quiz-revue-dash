import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TncTrialStatus {
  active: boolean;
  status: "active" | "expired" | "denied" | "not_eligible" | "error" | "none";
  expiresAt?: string | null;
}

const DEVICE_KEY = "ts_device_id";

function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function fingerprint() {
  const n = navigator as any;
  return [
    screen.width, screen.height, screen.colorDepth, window.devicePixelRatio,
    Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language,
    n.hardwareConcurrency ?? "", n.deviceMemory ?? "", navigator.platform, navigator.maxTouchPoints,
  ].join("|");
}

async function fetchTrial(): Promise<TncTrialStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { active: false, status: "none" };
  const { data, error } = await supabase.functions.invoke("tnc-trial", {
    body: { deviceId: getDeviceId(), fingerprint: fingerprint() },
  });
  if (error || !data) return { active: false, status: "error" };
  return data as TncTrialStatus;
}

export function useTncTrial(enabled = true) {
  const q = useQuery({ queryKey: ["tnc-trial"], queryFn: fetchTrial, enabled, staleTime: 60_000, retry: 1 });
  return { trial: q.data ?? { active: false, status: "none" as const }, isLoading: enabled && q.isLoading };
}
