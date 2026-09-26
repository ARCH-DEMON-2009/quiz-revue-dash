import MilestoneBadgeArt from "@/components/MilestoneBadgeArt";
import { MILESTONE_DEFINITIONS } from "@/components/MilestoneBadges";

interface MilestoneBadgeStripProps {
  badgeIds?: string[];
  max?: number;
}

const MilestoneBadgeStrip = ({ badgeIds = [], max = 3 }: MilestoneBadgeStripProps) => {
  const earned = MILESTONE_DEFINITIONS.filter((milestone) => badgeIds.includes(milestone.id));
  if (!earned.length) return null;

  const visible = earned.slice(0, max);
  const remaining = earned.length - visible.length;

  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-label={`${earned.length} milestone badges earned`}>
      {visible.map((milestone) => (
        <span key={milestone.id} title={`${milestone.title}: ${milestone.description}`}>
          <MilestoneBadgeArt id={milestone.id} icon={milestone.icon} size="xs" />
        </span>
      ))}
      {remaining > 0 && (
        <span className="pl-0.5 text-[10px] font-semibold text-muted-foreground" title={earned.slice(max).map((milestone) => milestone.title).join(", ")}>
          +{remaining}
        </span>
      )}
    </span>
  );
};

export default MilestoneBadgeStrip;