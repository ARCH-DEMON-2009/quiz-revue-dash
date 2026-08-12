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
    
    // Small delay to let the page settle before fetching
    const timer = setTimeout(() => {
      getErrorEntertainmentImage(cat)
        .then((u) => {
          if (!active) return;
          if (u) {
            setUrl(u);
          } else {
            setState("hidden");
          }
        })
        .catch(() => active && setState("hidden"));
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, errorType]);

  if (state === "hidden") return null;

  return (
    <div
      className={`relative mx-auto w-full max-w-[220px] aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 shadow-inner ${className ?? ""}`}
      data-testid="error-entertainment-image"
    >
      {/* Permanent skeleton/placeholder to prevent layout shift */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${state === "ready" ? "opacity-0" : "opacity-100"}`}>
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>

      {url && (
        <img
          src={url}
          alt="Decorative illustration"
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-700 ease-out transform ${state === "ready" ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          onLoad={() => setState("ready")}
          onError={() => setState("hidden")}
        />
      )}
    </div>
  );
};

export default ErrorEntertainmentImage;
