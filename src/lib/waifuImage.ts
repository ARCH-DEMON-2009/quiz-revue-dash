/**
 * Optional "entertainment image" service for error UIs (waifu.im).
 *
 * Rules:
 * - SFW only (`is_nsfw=false`), never NSFW/all.
 * - Short timeout, never blocks or breaks the real error UI.
 * - Lightweight in-memory cache per error category.
 * - No credentials, no user data sent.
 */

export type ErrorCategory =
  | "404"
  | "401"
  | "403"
  | "429"
  | "500"
  | "network"
  | "unknown";

const ENDPOINT = "https://api.waifu.im/search";
const TIMEOUT_MS = 3500;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Safe SFW tags per error category (all resolve to general SFW art). */
const TAG_BY_CATEGORY: Record<ErrorCategory, string | null> = {
  "404": "waifu",
  "401": "waifu",
  "403": "waifu",
  "429": "waifu",
  "500": "waifu",
  network: "waifu",
  unknown: null,
};

const cache = new Map<ErrorCategory, { url: string; at: number }>();

/** Map an HTTP status / error to a category. */
export function categorizeError(input?: number | string | null): ErrorCategory {
  if (typeof input === "number") {
    if (input === 404) return "404";
    if (input === 401) return "401";
    if (input === 403) return "403";
    if (input === 429) return "429";
    if (input >= 500) return "500";
    return "unknown";
  }
  const s = String(input ?? "").toLowerCase();
  if (!s) return "unknown";
  if (s.includes("404")) return "404";
  if (s.includes("401") || s.includes("unauthor")) return "401";
  if (s.includes("403") || s.includes("forbidden")) return "403";
  if (s.includes("429") || s.includes("rate limit")) return "429";
  if (s.includes("500") || s.includes("server error")) return "500";
  if (s.includes("network") || s.includes("fetch") || s.includes("offline") || s.includes("timeout"))
    return "network";
  return "unknown";
}

function pickSafeUrl(payload: unknown): string | null {
  const images = (payload as { images?: unknown })?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const safe = images.filter((img: any) => {
    if (!img || img.is_nsfw === true || img.isNsfw === true) return false;
    const url = typeof img.url === "string" ? img.url : "";
    return /^https:\/\/[^\s]+\.(jpe?g|png|webp|gif)$/i.test(url);
  });
  if (safe.length === 0) return null;
  const chosen = safe[Math.floor(Math.random() * safe.length)] as { url: string };
  return chosen.url;
}

async function request(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return pickSafeUrl(await res.json());
  } catch {
    return null;
  }
}

/**
 * Fetch a SFW entertainment image URL for an error category.
 * Resolves to `null` (silently) on any failure — callers must degrade gracefully.
 */
export async function getErrorEntertainmentImage(
  category: ErrorCategory = "unknown",
): Promise<string | null> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const tag = TAG_BY_CATEGORY[category];
    const base = `${ENDPOINT}?is_nsfw=false&limit=10`;
    let url = tag ? await request(`${base}&included_tags=${encodeURIComponent(tag)}`, controller.signal) : null;
    if (!url) url = await request(base, controller.signal);
    if (!url) return null;
    cache.set(category, { url, at: Date.now() });
    return url;
  } finally {
    clearTimeout(timer);
  }
}

/** Test helper: clear the in-memory cache. */
export function __clearEntertainmentImageCache() {
  cache.clear();
}
