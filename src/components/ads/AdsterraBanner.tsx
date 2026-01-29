import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

type BannerSize = "160x300" | "320x50" | "300x250" | "160x600" | "728x90";

interface AdsterraBannerProps {
  size: BannerSize;
  className?: string;
}

const bannerConfig: Record<BannerSize, { key: string; width: number; height: number }> = {
  "160x300": { key: "9426ee89780c3f6f250ecfafed9ec672", width: 160, height: 300 },
  "320x50": { key: "e7ced35b579694562c998830820ba11a", width: 320, height: 50 },
  "300x250": { key: "5c19334efae7207b5b96ce432e12af21", width: 300, height: 250 },
  "160x600": { key: "6a766be395341e972bf530dc5a6f165f", width: 160, height: 600 },
  "728x90": { key: "ddef4b09b740486b323b124a4a28f9dc", width: 728, height: 90 },
};

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

export const AdsterraBanner = ({ size, className = "" }: AdsterraBannerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { accessStatus, loading } = useAccessStatus();
  const isPremium = accessStatus?.type === 'premium';
  const scriptLoadedRef = useRef(false);

  const config = bannerConfig[size];

  useEffect(() => {
    if (loading || isPremium || scriptLoadedRef.current || !containerRef.current) return;

    // Create options script
    const optionsScript = document.createElement("script");
    optionsScript.innerHTML = `
      atOptions = {
        'key' : '${config.key}',
        'format' : 'iframe',
        'height' : ${config.height},
        'width' : ${config.width},
        'params' : {}
      };
    `;
    containerRef.current.appendChild(optionsScript);

    // Create invoke script
    const invokeScript = document.createElement("script");
    invokeScript.src = `https://performhouseholduneasy.com/${config.key}/invoke.js`;
    invokeScript.async = true;
    containerRef.current.appendChild(invokeScript);
    
    scriptLoadedRef.current = true;
  }, [isPremium, loading, config]);

  if (loading || isPremium) {
    return null;
  }

  return (
    <div className={`adsterra-banner flex justify-center my-4 ${className}`}>
      <div ref={containerRef} style={{ minWidth: config.width, minHeight: config.height }}></div>
    </div>
  );
};

export default AdsterraBanner;
