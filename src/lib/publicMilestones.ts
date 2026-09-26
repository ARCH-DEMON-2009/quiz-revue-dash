import { supabase } from "@/integrations/supabase/client";

export interface PublicMilestoneProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  badge_ids: string[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPublicMilestoneProfiles(userIds: string[]) {
  const validUserIds = [...new Set(userIds.filter((id) => UUID_PATTERN.test(id)))].slice(0, 250);
  const profiles = new Map<string, PublicMilestoneProfile>();
  if (!validUserIds.length) return profiles;

  const { data, error } = await supabase.rpc("get_public_milestone_profiles", {
    p_user_ids: validUserIds,
  });
  if (error) throw error;

  for (const profile of data ?? []) {
    profiles.set(profile.user_id, profile as PublicMilestoneProfile);
  }
  return profiles;
}