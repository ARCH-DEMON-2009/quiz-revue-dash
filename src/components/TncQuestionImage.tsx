import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTncImageDataUrl, getCachedTncImage } from "@/lib/tncApi";

/** Attempts before we give up and show the retry card. */
const MAX_RETRIES = 3;

/**
 * Renders a CRM question image.
 *
 * The CRM blocks cross-origin <img> hotlinking, so a direct browser load
 * typically hangs (never firing onload/onerror) and the skeleton would stay
 * forever. We therefore ALWAYS resolve images through the edge proxy, which
 * returns a CORS-safe base64 data URL (cached module-wide and shared with the
 * PDF exporter). Loading UX: shimmer skeleton while resolving, automatic
 * retries with backoff, and a manual retry card only after retries are spent.
 */
const TncQuestionImage = ({ url }: { url: string }) => {
  const cached = getCachedTncImage(url);
  const [src, setSrc] = useState<string | null>(cached ?? null);
  const [err, setErr] = useState(false);
  const retries = useRef(0);
  const mounted = useRef(true);

  const load = async () => {
    setErr(false);
    const dataUrl = await fetchTncImageDataUrl(url);
    if (!mounted.current) return;
    if (dataUrl) {
      setSrc(dataUrl);
      return;
    }
    if (retries.current < MAX_RETRIES) {
      retries.current += 1;
      setTimeout(load, 600 * retries.current);
    } else {
      setErr(true);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (!cached) load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const retry = () => {
    retries.current = 0;
    setSrc(null);
    load();
  };

  if (err) {
    return (
      <div className="my-3 flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Image could not be loaded
        </span>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={retry}>
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="my-3 relative max-w-sm">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground/70">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading image…
        </div>
      </div>
    );
  }

  return (
    <div className="my-3">
      <img
        src={src}
        alt="Question illustration"
        loading="lazy"
        className="max-h-72 rounded-lg border object-contain"
      />
    </div>
  );
};

export default TncQuestionImage;
