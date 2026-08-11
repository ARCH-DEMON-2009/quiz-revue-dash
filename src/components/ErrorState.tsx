import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import ErrorEntertainmentImage from "@/components/ErrorEntertainmentImage";

interface Props {
  title?: string;
  /** The real error message — always rendered, untouched. */
  message?: string | null;
  /** HTTP status / error code shown to the user and used to pick the image. */
  code?: number | string | null;
  onRetry?: () => void;
  onBack?: () => void;
  retryLabel?: string;
  backLabel?: string;
  className?: string;
}

/**
 * Central error display: real error text + actions, with an optional
 * decorative image that silently disappears if unavailable.
 */
const ErrorState = ({
  title = "Something went wrong",
  message,
  code,
  onRetry,
  onBack,
  retryLabel = "Try Again",
  backLabel = "Go Back",
  className,
}: Props) => (
  <div
    className={`glass rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left ${className ?? ""}`}
    role="alert"
  >
    <ErrorEntertainmentImage errorType={code ?? message} className="sm:max-w-[160px]" />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
      </div>
      {message && <p className="text-muted-foreground break-words">{message}</p>}
      {code !== undefined && code !== null && code !== "" && (
        <p className="text-xs text-muted-foreground/70 mt-1">Error code: {code}</p>
      )}

      {(onRetry || onBack) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center sm:justify-start">
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </Button>
          )}
          {onBack && (
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
);

export default ErrorState;
