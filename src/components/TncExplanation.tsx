import { Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanHtml } from "@/lib/sanitizeHtml";
import { getTncExplanationVideoUrl } from "@/lib/tncYoutube";

const TncExplanation = ({
  html,
  videoUrl,
  className = "",
  bare = false,
}: {
  html: string | null | undefined;
  videoUrl?: string | null;
  className?: string;
  bare?: boolean;
}) => {
  const explanationVideoUrl = getTncExplanationVideoUrl(html, videoUrl);

  return (
    <div className={bare ? className : `rounded-md bg-muted/50 p-3 text-sm text-muted-foreground ${className}`}>
      {!bare && <span className="font-medium text-foreground">Explanation: </span>}
      <span
        className={bare ? "block" : undefined}
        dangerouslySetInnerHTML={{ __html: cleanHtml(html, { allowLinks: true }) }}
      />
      {explanationVideoUrl && (
        <div>
          <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
            <a href={explanationVideoUrl} target="_blank" rel="noopener noreferrer">
              <Youtube className="h-4 w-4 text-red-600" /> Watch explanation video
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default TncExplanation;