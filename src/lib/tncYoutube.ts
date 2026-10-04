const YOUTUBE_URL_PATTERN = /(?:(?:https?:)?\/\/)?(?:www\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[^\s<>"']+/gi;

function isYoutubeVideoUrl(candidate: string, depth = 0): string | null {
  if (depth > 2) return null;
  const normalized = candidate
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/[.,!?;:)\]}]+$/, "");

  try {
    const url = new URL(/^(?:https?:)?\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    const host = url.hostname.toLowerCase();
    const isYoutube = host === "youtu.be" || host.endsWith(".youtube.com") || host === "youtube.com" ||
      host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
    if (!isYoutube) return null;

    if (url.pathname === "/attribution_link") {
      const target = url.searchParams.get("u") ?? url.searchParams.get("q");
      if (target) {
        const targetUrl = target.startsWith("/") ? `https://${host}${target}` : target;
        return isYoutubeVideoUrl(targetUrl, depth + 1);
      }
    }

    const [route, videoId] = url.pathname.split("/").filter(Boolean);
    const hasVideoId = Boolean(videoId);
    const isVideoUrl = host === "youtu.be"
      ? Boolean(route)
      : (route === "watch" && Boolean(url.searchParams.get("v"))) ||
        (["embed", "shorts", "live", "v"].includes(route ?? "") && hasVideoId);
    return isVideoUrl ? url.href : null;
  } catch {
    try {
      return isYoutubeVideoUrl(decodeURIComponent(normalized), depth + 1);
    } catch {
      return null;
    }
  }
}

/** Find a YouTube video URL in CRM explanation HTML or plain text. */
export function getTncExplanationVideoUrl(
  explanation: string | null | undefined,
  videoUrl?: string | null,
): string | null {
  if (videoUrl) {
    const directVideoUrl = isYoutubeVideoUrl(videoUrl);
    if (directVideoUrl) return directVideoUrl;
  }
  if (!explanation) return null;

  const candidates: string[] = [];
  let linkedVideoUrl: string | null = null;
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(explanation, "text/html");
    const links = Array.from(parsed.querySelectorAll("a[href]"));
    const mentionsVideo = /\b(video|watch|play)\b/i.test(parsed.body.textContent ?? "");
    const videoLink = links.find((link) => /\b(video|watch|play)\b/i.test(link.textContent ?? "")) ??
      (mentionsVideo && links.length === 1 ? links[0] : undefined);
    if (videoLink) {
      const href = videoLink.getAttribute("href")?.trim();
      if (href) {
        try {
          const normalizedHref = href.replace(/&amp;/gi, "&").replace(/\\\//g, "/");
          const target = new URL(normalizedHref, "https://www.youtube.com");
          if (target.protocol === "http:" || target.protocol === "https:") {
            linkedVideoUrl = isYoutubeVideoUrl(target.href);
          }
        } catch {
          // Ignore malformed anchor targets and fall back to direct URL detection.
        }
      }
    }
    candidates.push(...Array.from(parsed.querySelectorAll("[href], [src], [data-href], [data-url]"), (element) =>
      ["href", "src", "data-href", "data-url"].map((attribute) => element.getAttribute(attribute) ?? "").join(" "),
    ));
    candidates.push(parsed.body.textContent ?? "");
  }
  candidates.push(explanation);

  for (const source of candidates) {
    for (const match of source.matchAll(YOUTUBE_URL_PATTERN)) {
      const videoUrl = isYoutubeVideoUrl(match[0]);
      if (videoUrl) return videoUrl;
    }
  }

  return linkedVideoUrl;
}