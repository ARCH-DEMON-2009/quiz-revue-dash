import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Flame, Target, TrendingUp, Trophy, Zap, Medal, Crown, Star } from "lucide-react";
import MilestoneBadgeArt from "@/components/MilestoneBadgeArt";

export interface MilestoneInput {
  totalTests: number;
  overallAccuracy: number;
  bestScore: number;
  streakDays: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  current: number;
  goal: number;
  unit: string;
}

export const MILESTONE_DEFINITIONS: Omit<Milestone, "current">[] = [
  { id: "first", title: "First Step", description: "Finish your first test", icon: Zap, goal: 1, unit: "tests" },
  { id: "ten", title: "Getting Serious", description: "Finish 10 tests", icon: Target, goal: 10, unit: "tests" },
  { id: "fifty", title: "Marathon Runner", description: "Finish 50 tests", icon: Trophy, goal: 50, unit: "tests" },
  { id: "hundred", title: "Century Club", description: "Finish 100 tests", icon: Award, goal: 100, unit: "tests" },
  { id: "twoFifty", title: "Test Legend", description: "Finish 250 tests", icon: Crown, goal: 250, unit: "tests" },
  { id: "acc60", title: "Steady Hand", description: "Reach 60% overall accuracy", icon: TrendingUp, goal: 60, unit: "%" },
  { id: "acc80", title: "Sharp Shooter", description: "Reach 80% overall accuracy", icon: Medal, goal: 80, unit: "%" },
  { id: "acc90", title: "Precision Ace", description: "Reach 90% overall accuracy", icon: Target, goal: 90, unit: "%" },
  { id: "score90", title: "Topper Zone", description: "Score 90% in a single test", icon: Crown, goal: 90, unit: "%" },
  { id: "score95", title: "Elite Performer", description: "Score 95% in a single test", icon: Medal, goal: 95, unit: "%" },
  { id: "scorePerfect", title: "Perfect Score", description: "Score 100% in a single test", icon: Star, goal: 100, unit: "%" },
  { id: "streak3", title: "3-Day Streak", description: "Practise 3 days in a row", icon: Flame, goal: 3, unit: "days" },
  { id: "streak7", title: "7-Day Streak", description: "Practise 7 days in a row", icon: Flame, goal: 7, unit: "days" },
  { id: "streak14", title: "Fortnight Focus", description: "Practise 14 days in a row", icon: Flame, goal: 14, unit: "days" },
  { id: "streak30", title: "Unstoppable", description: "Practise 30 days in a row", icon: Crown, goal: 30, unit: "days" },
];

export const buildMilestones = (s: MilestoneInput): Milestone[] =>
  MILESTONE_DEFINITIONS.map((milestone) => ({
    ...milestone,
    current: milestone.unit === "tests"
      ? s.totalTests
      : milestone.unit === "days"
        ? s.streakDays
        : milestone.id.startsWith("acc")
          ? s.overallAccuracy
          : s.bestScore,
  }));

export const getEarnedMilestoneIds = (stats: MilestoneInput) =>
  buildMilestones(stats).filter((milestone) => milestone.current >= milestone.goal).map((milestone) => milestone.id);

const MilestoneBadges = ({ stats, earnedIds }: { stats: MilestoneInput; earnedIds?: string[] }) => {
  const milestones = buildMilestones(stats);
  const earnedSet = earnedIds ? new Set(earnedIds) : null;
  const earned = earnedSet
    ? milestones.filter((milestone) => earnedSet.has(milestone.id)).length
    : milestones.filter((milestone) => milestone.current >= milestone.goal).length;

  return (
    <Card className="mb-4 sm:mb-6 lg:mb-8">
      <CardHeader className="p-3 sm:p-4 lg:p-6 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Milestone Badges
        </CardTitle>
        <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
          {earned}/{milestones.length} earned
        </span>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {milestones.map((m) => {
            const unlocked = earnedSet ? earnedSet.has(m.id) : m.current >= m.goal;
            const pct = unlocked ? 100 : Math.min(100, (m.current / m.goal) * 100);
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 sm:p-4 min-w-0 transition-colors ${
                  unlocked
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-muted/30 opacity-80"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <MilestoneBadgeArt id={m.id} icon={Icon} size="sm" locked={!unlocked} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  {unlocked
                    ? "Unlocked"
                    : `${m.unit === "%" ? m.current.toFixed(1) : Math.floor(m.current)} / ${m.goal} ${m.unit}`}
                  {unlocked && <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneBadges;
