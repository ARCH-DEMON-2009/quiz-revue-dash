import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import LeaderboardIdentityAvatar, { identityNameClass } from "@/components/LeaderboardIdentityAvatar";
import { toDisplayName } from "@/lib/displayName";

interface Props {
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isPremium?: boolean;
  adminFrame?: string;
  adminBadge?: string;
  planDurationType?: string | null;
}

/**
 * "How you appear" preview: shows the exact avatar + frame + badge combination
 * used on leaderboard cards and inside downloaded PDF reports.
 */
const IdentityPreviewCard = (props: Props) => {
  const displayName = toDisplayName(props.name);

  return (
    <Card className="glass" data-testid="identity-preview">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary" />
          How you appear
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-card p-3">
          <p className="text-xs text-muted-foreground mb-2">Leaderboard card</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/60 font-bold">
              #1
            </div>
            <LeaderboardIdentityAvatar {...props} />
            <div className="min-w-0 flex-1">
              <p className={`font-semibold truncate ${identityNameClass(props)}`}>{displayName}</p>
              <p className="text-xs text-muted-foreground">12 tests • 88.0%</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              Top 1%
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground">
          <p className="text-[10px] uppercase tracking-wider opacity-80 mb-2">PDF report header</p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">Test Sagar</p>
              <p className="text-xs opacity-90 truncate">Candidate: {displayName}</p>
            </div>
            <LeaderboardIdentityAvatar {...props} size="md" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your name is always shown instead of your email — on every leaderboard and in every PDF.
        </p>
      </CardContent>
    </Card>
  );
};

export default IdentityPreviewCard;
