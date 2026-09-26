import type { ElementType } from "react";

const TONES: Record<string, [string, string, string]> = {
  first: ["#e2e8f0", "#94a3b8", "#334155"],
  ten: ["#fde68a", "#f59e0b", "#78350f"],
  fifty: ["#fef3c7", "#d6d3d1", "#57534e"],
  hundred: ["#fde68a", "#ca8a04", "#713f12"],
  twoFifty: ["#fef08a", "#f59e0b", "#7c2d12"],
  acc60: ["#a7f3d0", "#14b8a6", "#134e4a"],
  acc80: ["#bae6fd", "#0ea5e9", "#0c4a6e"],
  acc90: ["#c4b5fd", "#8b5cf6", "#4c1d95"],
  score90: ["#fbcfe8", "#ec4899", "#831843"],
  score95: ["#fecaca", "#ef4444", "#7f1d1d"],
  scorePerfect: ["#fef08a", "#eab308", "#713f12"],
  streak3: ["#fed7aa", "#f97316", "#7c2d12"],
  streak7: ["#a5f3fc", "#06b6d4", "#164e63"],
  streak14: ["#ddd6fe", "#7c3aed", "#3b0764"],
  streak30: ["#fef08a", "#f97316", "#7f1d1d"],
};

interface MilestoneBadgeArtProps {
  id: string;
  icon: ElementType;
  size?: "xs" | "sm" | "md";
  locked?: boolean;
  className?: string;
}

const MilestoneBadgeArt = ({ id, icon: Icon, size = "md", locked = false, className = "" }: MilestoneBadgeArtProps) => {
  const [light, mid, dark] = TONES[id] ?? TONES.first;
  const gradientId = `milestone-${id}-gradient`;
  const dimensions = size === "xs" ? "h-5 w-5" : size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const iconDimensions = size === "xs" ? "h-2.5 w-2.5" : size === "sm" ? "h-4 w-4" : "h-7 w-7";

  return (
    <span
      role="img"
      aria-label={id}
      className={`relative inline-flex shrink-0 items-center justify-center ${dimensions} ${locked ? "grayscale opacity-45" : "drop-shadow-sm"} ${className}`}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.52" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        </defs>
        <path d="M19 43 13 61l13-6 6 8 6-8 13 6-6-18" fill={dark} stroke="#17212b" strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 3 39 9 49 7 52 17 61 23 57 33 59 44 48 49 42 58 32 55 22 58 16 49 5 44 7 33 3 23 12 17 15 7 25 9Z" fill={`url(#${gradientId})`} stroke="#17212b" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M32 10 37 15 45 14 47 22 54 26 51 33 53 41 45 44 41 51 32 48 23 51 19 44 11 41 13 33 10 26 17 22 19 14 27 15Z" fill="#101820" stroke="#f8fafc" strokeOpacity=".85" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m32 18 3.4 7 7.6 1.1-5.5 5.3 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.3 7.6-1.1Z" fill={`url(#${gradientId})`} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <Icon className={`relative z-10 ${iconDimensions} ${size === "xs" ? "opacity-0" : "text-white drop-shadow"}`} aria-hidden="true" />
    </span>
  );
};

export default MilestoneBadgeArt;