import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  categorizeError,
  getErrorEntertainmentImage,
  type ErrorCategory,
} from "@/lib/waifuImage";

interface Props {
  /** HTTP status code or error message used to pick a fitting image. */
  errorType?: number | string | null;
  category?: ErrorCategory;
  className?: string;
}

/**
 * Purely decorative image shown next to an error message.
 * Fails silently: if the API is slow, unavailable or the image can't load,
 * nothing is rendered and the surrounding error UI is untouched.
 */
const ErrorEntertainmentImage = ({ errorType, category, className }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");

  useEffect(() => {
    let active = true;
    const cat = category ?? categorizeError(errorType);
    getErrorEntertainmentImage(cat)
      .then((u) => {
        if (!active) return;
        if (u) setUrl(u);
        else setState("hidden");
      })
      .catch(() => active && setState("hidden"));
    return () => {
      active = false;
    };
    // One attempt per mount — never retry in a loop.
  }, [category, errorType]);

  if (state === "hidden") return null;

  return (
    <div
      className={`mx-auto w-full max-w-[220px] aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 bg-muted/40 ${className ?? ""}`}
      data-testid="error-entertainment-image"
    >
      {state === "loading" && <Skeleton className="h-full w-full rounded-2xl" />}
      {url && (
        <img
          src={url}
          alt="Decorative illustration shown with this error message"
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0 h-0"}`}
          onLoad={() => setState("ready")}
          onError={() => setState("hidden")}
        />
      )}
    </div>
  );
};

export default ErrorEntertainmentImage;
