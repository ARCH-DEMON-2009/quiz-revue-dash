import { useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTncImageDataUrl } from "@/lib/tncApi";

/** Module-level cache: original URL -> resolved src (direct URL or proxied data URL). */
const imgCache = new Map<string, string>();

/**
 * Renders a CRM question image. The CRM blocks cross-origin <img> hotlinking, so
 * when a direct load fails we fall back to the edge proxy which returns a
 * CORS-safe base64 data URL (the same path the PDF export uses).
 */
const TncQuestionImage = ({ url }: { url: string }) => {
  const [src, setSrc] = useState<string | null>(() => imgCache.get(url) ?? url);
  const [loaded, setLoaded] = useState(() => imgCache.has(url));
  const [err, setErr] = useState(false);
  const triedProxy = useRef(imgCache.has(url));

  const loadViaProxy = async () => {
    const dataUrl = await fetchTncImageDataUrl(url);
    if (dataUrl) {
      imgCache.set(url, dataUrl);
      setSrc(dataUrl);
      setErr(false);
    } else {
      setErr(true);
    }
  };

  const handleError = () => {
    if (!triedProxy.current) {
      triedProxy.current = true;
      setLoaded(false);
      loadViaProxy();
    } else {
      setErr(true);
    }
  };

  const retry = () => {
    setErr(false);
    setLoaded(false);
    triedProxy.current = false;
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
      {!loaded && <Skeleton className="h-48 w-full max-w-sm rounded-lg" />}
      {src && (
        <img
          src={src}
          alt="Question illustration"
          loading="lazy"
          onError={handleError}
          onLoad={() => {
            imgCache.set(url, src);
            setLoaded(true);
          }}
          className={`max-h-72 rounded-lg border object-contain ${loaded ? "" : "hidden"}`}
        />
      )}
    </div>
  );
};

export default TncQuestionImage;
