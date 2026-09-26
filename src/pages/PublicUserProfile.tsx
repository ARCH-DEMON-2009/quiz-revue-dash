import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Award, User } from "lucide-react";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MilestoneBadgeArt from "@/components/MilestoneBadgeArt";
import { MILESTONE_DEFINITIONS } from "@/components/MilestoneBadges";
import { supabase } from "@/integrations/supabase/client";

interface PublicProfileData {
  user_id: string;
  name: string;
  avatar_url: string | null;
  badge_ids: string[];
}

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PublicUserProfile = () => {
  const { userId = "" } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!USER_ID_PATTERN.test(userId)) {
        setFailed(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_public_milestone_profiles", {
        p_user_ids: [userId],
      });
      if (error) throw error;
      if (!active) return;
      setProfile((data?.[0] as PublicProfileData | undefined) ?? null);
      setFailed(!data?.length);
      setLoading(false);
    };

    void load().catch((error) => {
      console.error("Could not load public profile:", error);
      if (active) {
        setFailed(true);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const earned = new Set(profile?.badge_ids ?? []);
  const milestones = MILESTONE_DEFINITIONS.filter((milestone) => earned.has(milestone.id));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Helmet>
        <title>{profile?.name ? `${profile.name} | Test Sagar` : "Student Profile | Test Sagar"}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <NavigationHeader />
      <main className="container mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Button variant="ghost" asChild className="mb-5 gap-2">
          <Link to="/leaderboard"><ArrowLeft className="h-4 w-4" /> Back to Leaderboard</Link>
        </Button>

        {loading ? (
          <div aria-busy="true" className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
            </div>
          </div>
        ) : failed || !profile ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">This profile is unavailable.</p>
          </Card>
        ) : (
          <>
            <Card className="mb-8 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{profile.name || "Student"}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Milestones and achievements</p>
              </div>
            </Card>

            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Earned Badges <span className="text-sm font-normal text-muted-foreground">({milestones.length})</span></h2>
            </div>
            {milestones.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {milestones.map((milestone) => (
                  <Card key={milestone.id} className="flex items-center gap-3 p-4">
                    <MilestoneBadgeArt id={milestone.id} icon={milestone.icon} size="md" />
                    <div className="min-w-0">
                      <h3 className="font-semibold">{milestone.title}</h3>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No milestone badges earned yet.
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PublicUserProfile;