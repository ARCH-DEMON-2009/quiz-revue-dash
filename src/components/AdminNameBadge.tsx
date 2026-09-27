import { useState } from "react";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";

interface AdminNameBadgeProps {
  badgeIcon?: string | null;
  size?: "sm" | "md";
}

const BADGE_ASSETS = new Set(["b1", "b2", "b3"]);

const AdminNameBadge = ({ badgeIcon, size = "sm" }: AdminNameBadgeProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasBadgeAsset = !!badgeIcon && BADGE_ASSETS.has(badgeIcon) && !imageFailed;
  const FallbackIcon = badgeIcon === "shield" ? ShieldCheck : badgeIcon === "star" ? Sparkles : Crown;

  return (
    <span
      className={`admin-name-badge ${size === "md" ? "admin-name-badge--md" : ""}`}
      role="img"
      aria-label="Test Sagar administrator"
      title="Test Sagar administrator"
    >
      <span className="admin-name-badge__content">
        {hasBadgeAsset ? (
          <img
            src={`/badges/${badgeIcon}.png`}
            alt=""
            className="admin-name-badge__icon"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <FallbackIcon className="admin-name-badge__icon" aria-hidden="true" />
        )}
        <span>ADMIN</span>
      </span>
    </span>
  );
};

export default AdminNameBadge;
