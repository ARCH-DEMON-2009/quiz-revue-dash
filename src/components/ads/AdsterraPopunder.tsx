import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

export const AdsterraPopunder = () => {
  const { accessStatus, loading } = useAccessStatus();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  
  const isPremium = accessStatus?.type === 'premium';
  const isAuthenticated = accessStatus !== null;

  useEffect(() => {
    // Wait for auth to complete loading
    if (loading) return;
    
    // Don't show ads to premium users
    if (isPremium) {
      // Clean up any existing script
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      return;
    }

    // Only load for authenticated non-premium users
    if (!isAuthenticated) return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="cf8044281095b9254045cc819bf4bc82"]');
    if (existingScript) return;

    // Load popunder script for free users
    const script = document.createElement("script");
    script.src = "https://performhouseholduneasy.com/cf/80/44/cf8044281095b9254045cc819bf4bc82.js";
    script.async = true;
    scriptRef.current = script;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [isPremium, loading, isAuthenticated]);

  return null;
};

export default AdsterraPopunder;
