import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayInitial, toDisplayName } from "@/lib/displayName";

export interface LeaderboardIdentityProps {
  name?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isPremium?: boolean;
  /** Admin frame key from admin badge config (f1|f2|f3). */
  adminFrame?: string;
  /** Admin badge key from admin badge config (b1|b2|b3). */
  adminBadge?: string;
  planDurationType?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FRAMES = ["f1", "f2", "f3"];
const BADGES = ["b1", "b2", "b3"];

/** Admin visuals always win over premium visuals. */
export function resolveIdentityArt(props: LeaderboardIdentityProps) {
  if (props.isAdmin) {
    const frame = FRAMES.includes(props.adminFrame ?? "") ? props.adminFrame! : "f3";
    const badge = BADGES.includes(props.adminBadge ?? "") ? props.adminBadge! : "b3";
    return { frameUrl: `/frames/${frame}.png`, badgeUrl: `/badges/${badge}.png`, tier: "admin" as const };
  }
  if (props.isPremium) {
    return { frameUrl: "/frames/f3.png", badgeUrl: "/badges/b1.png", tier: "premium" as const };
  }
  return { frameUrl: null, badgeUrl: null, tier: "free" as const };
}

export function identityNameClass(props: LeaderboardIdentityProps) {
  if (props.isAdmin)
    return "bg-gradient-to-r from-red-500 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent font-extrabold";
  if (!props.isPremium) return "text-foreground";
  const p = props.planDurationType ?? "";
  if (["yearly", "12_months", "2years"].includes(p)) return "text-amber-500 font-bold drop-shadow-sm";
  if (p === "6_months") return "text-blue-500 font-bold drop-shadow-sm";
  return "text-emerald-500 font-bold drop-shadow-sm";
}

/**
 * Avatar + frame + badge used on every leaderboard.
 * Falls back to initials (never an email) when no avatar/name is available.
 */
const LeaderboardIdentityAvatar = (props: LeaderboardIdentityProps) => {
  const { frameUrl, badgeUrl, tier } = resolveIdentityArt(props);
  const name = toDisplayName(props.name);
  const dim = props.size === "md" ? "h-12 w-12" : "h-10 w-10";
  const avatarSrc =
    props.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className={`relative ${dim} flex-shrink-0 ${props.className ?? ""}`} data-tier={tier}>
      <div className="absolute inset-0 z-10 pointer-events-none overflow-visible">
        {frameUrl && (
          <img
            src={frameUrl}
            alt={tier === "admin" ? "Admin Frame" : "Premium Frame"}
            data-testid="identity-frame"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] max-w-none object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/frames/f3.png";
            }}
          />
        )}
      </div>

      <Avatar className={`${dim} relative bg-background border-2 border-transparent overflow-hidden z-0`}>
        <AvatarImage src={avatarSrc} className="object-cover" loading="lazy" alt={name} />
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {displayInitial(props.name)}
        </AvatarFallback>
      </Avatar>

      {badgeUrl && (
        <div className="absolute -top-3 -right-3 z-20">
          <img
            src={badgeUrl}
            alt={tier === "admin" ? "Admin Badge" : "Premium Badge"}
            data-testid="identity-badge"
            className="w-8 h-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = tier === "admin" ? "/badges/b3.png" : "/badges/b1.png";
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LeaderboardIdentityAvatar;
