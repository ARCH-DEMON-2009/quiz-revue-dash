/**
 * Public display-name resolution.
 * Never leak raw emails on leaderboards, PDFs or shared pages.
 */
export const DEFAULT_DISPLAY_NAME = "Student";

export function toDisplayName(
  name?: string | null,
  fallback: string = DEFAULT_DISPLAY_NAME,
): string {
  const raw = (name ?? "").trim();
  if (!raw) return fallback;
  if (raw.toLowerCase() === "user" || raw.toLowerCase() === "unknown") return fallback;
  if (!raw.includes("@")) return raw;

  // Mask the email parts to avoid leaking identity
  const parts = raw.split("@");
  const local = parts[0].replace(/[._-]+/g, " ").trim();
  if (local.length > 3) return `${local.slice(0, 3)}***`;
  return fallback;
}

/** First letter used for avatar fallbacks. */
export function displayInitial(name?: string | null): string {
  return toDisplayName(name).charAt(0).toUpperCase() || "S";
}
