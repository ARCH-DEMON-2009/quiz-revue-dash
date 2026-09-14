import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Flame, Target, TrendingUp, Trophy, Zap, Medal, Crown } from "lucide-react";

export interface MilestoneInput {
  totalTests: number;
  overallAccuracy: number;
  bestScore: number;
  streakDays: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  current: number;
  goal: number;
  unit: string;
}

const buildMilestones = (s: MilestoneInput): Milestone[] => [
  { id: "first", title: "First Step", description: "Finish your first test", icon: Zap, current: s.totalTests, goal: 1, unit: "tests" },
  { id: "ten", title: "Getting Serious", description: "Finish 10 tests", icon: Target, current: s.totalTests, goal: 10, unit: "tests" },
  { id: "fifty", title: "Marathon Runner", description: "Finish 50 tests", icon: Trophy, current: s.totalTests, goal: 50, unit: "tests" },
  { id: "acc60", title: "Steady Hand", description: "Reach 60% overall accuracy", icon: TrendingUp, current: s.overallAccuracy, goal: 60, unit: "%" },
  { id: "acc80", title: "Sharp Shooter", description: "Reach 80% overall accuracy", icon: Medal, current: s.overallAccuracy, goal: 80, unit: "%" },
  { id: "score90", title: "Topper Zone", description: "Score 90% in a single test", icon: Crown, current: s.bestScore, goal: 90, unit: "%" },
  { id: "streak3", title: "3-Day Streak", description: "Practise 3 days in a row", icon: Flame, current: s.streakDays, goal: 3, unit: "days" },
  { id: "streak7", title: "7-Day Streak", description: "Practise 7 days in a row", icon: Flame, current: s.streakDays, goal: 7, unit: "days" },
];

const MilestoneBadges = ({ stats }: { stats: MilestoneInput }) => {
  const milestones = buildMilestones(stats);
  const earned = milestones.filter((m) => m.current >= m.goal).length;

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
            const unlocked = m.current >= m.goal;
            const pct = Math.min(100, (m.current / m.goal) * 100);
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
                  <div className={`p-2 rounded-lg shrink-0 ${unlocked ? "bg-primary/15" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 ${unlocked ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {unlocked
                    ? "Unlocked"
                    : `${m.unit === "%" ? m.current.toFixed(1) : Math.floor(m.current)} / ${m.goal} ${m.unit}`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneBadges;
