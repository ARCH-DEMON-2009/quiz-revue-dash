import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTncImageDataUrl, getCachedTncImage } from "@/lib/tncApi";

/** Attempts before we give up and show the retry card. */
const MAX_AUTO_RETRIES = 2;

/**
 * Renders a CRM question image. The CRM blocks cross-origin <img> hotlinking, so
 * when a direct load fails we fall back to the edge proxy which returns a
 * CORS-safe base64 data URL (the same cached path the PDF export uses).
 *
 * Loading UX: shimmer skeleton while resolving, automatic retries via the proxy,
 * and a manual retry card only after automatic attempts are exhausted.
 */
const TncQuestionImage = ({ url }: { url: string }) => {
  const cached = getCachedTncImage(url);
  const [src, setSrc] = useState<string | null>(cached ?? url);
  const [loaded, setLoaded] = useState(!!cached);
  const [err, setErr] = useState(false);
  const triedProxy = useRef(!!cached);
  const retries = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadViaProxy = async () => {
    const dataUrl = await fetchTncImageDataUrl(url);
    if (!mounted.current) return;
    if (dataUrl) {
      setSrc(dataUrl);
      setErr(false);
    } else if (retries.current < MAX_AUTO_RETRIES) {
      retries.current += 1;
      setTimeout(loadViaProxy, 600 * retries.current);
    } else {
      setErr(true);
    }
  };

  const handleError = () => {
    if (!triedProxy.current) {
      triedProxy.current = true;
      setLoaded(false);
      loadViaProxy();
    } else if (retries.current < MAX_AUTO_RETRIES) {
      retries.current += 1;
      setLoaded(false);
      setTimeout(loadViaProxy, 600 * retries.current);
    } else {
      setErr(true);
    }
  };

  const retry = () => {
    setErr(false);
    setLoaded(false);
    triedProxy.current = false;
    retries.current = 0;
    setSrc(`${url}${url.includes("?") ? "&" : "?"}r=${Date.now()}`);
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

  return (
    <div className="my-3">
      {!loaded && (
        <div className="relative max-w-sm">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground/70">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Loading image…
          </div>
        </div>
      )}
      {src && (
        <img
          src={src}
          alt="Question illustration"
          loading="lazy"
          onError={handleError}
          onLoad={() => setLoaded(true)}
          className={`max-h-72 rounded-lg border object-contain transition-opacity duration-300 ${
            loaded ? "opacity-100" : "hidden opacity-0"
          }`}
        />
      )}
    </div>
  );
};

export default TncQuestionImage;
