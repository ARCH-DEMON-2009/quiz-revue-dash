import { useAccessStatus } from "@/components/AccessGuard";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface AdsterraDirectLinkProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "button" | "link" | "text";
}

const DIRECT_LINK = "https://performhouseholduneasy.com/gzb0k71hum?key=fd2a7f037724d9c6a8a7e4307cd816fd";

export const AdsterraDirectLink = ({ 
  children = "Special Offer", 
  className = "",
  variant = "button"
}: AdsterraDirectLinkProps) => {
  const { accessStatus, loading } = useAccessStatus();
  const isPremium = accessStatus?.type === 'premium';

  if (loading || isPremium) {
    return null;
  }

  if (variant === "button") {
    return (
      <a href={DIRECT_LINK} target="_blank" rel="noopener noreferrer" className={className}>
        <Button variant="outline" className="gap-2">
          {children}
          <ExternalLink className="h-4 w-4" />
        </Button>
      </a>
    );
  }

  if (variant === "link") {
    return (
      <a 
        href={DIRECT_LINK} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`text-primary hover:underline inline-flex items-center gap-1 ${className}`}
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <a 
      href={DIRECT_LINK} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`hover:underline ${className}`}
    >
      {children}
    </a>
  );
};

export default AdsterraDirectLink;
