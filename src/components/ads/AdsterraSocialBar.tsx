import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

export const AdsterraSocialBar = () => {
  const { accessStatus, loading } = useAccessStatus();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  
  const isPremium = accessStatus?.type === 'premium';
  const isAuthenticated = accessStatus !== null;

  useEffect(() => {
    // Wait for auth to complete loading
    if (loading) return;
    
    // Don't show ads to premium users - also clean up any existing elements
    if (isPremium) {
      // Remove script
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      // Remove any Adsterra social bar elements that may have been injected
      const adElements = document.querySelectorAll('[class*="pl-440431777cf8706fc842fbc5c0fa6156"]');
      adElements.forEach(el => el.remove());
      const adIframes = document.querySelectorAll('iframe[id*="container-440431777cf8706fc842fbc5c0fa6156"]');
      adIframes.forEach(el => el.remove());
      return;
    }

    // Only load for authenticated non-premium users
    if (!isAuthenticated) return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="440431777cf8706fc842fbc5c0fa6156"]');
    if (existingScript) return;

    // Load social bar script for free users
    const script = document.createElement("script");
    script.src = "https://performhouseholduneasy.com/44/04/31/440431777cf8706fc842fbc5c0fa6156.js";
    script.async = true;
    scriptRef.current = script;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      // Also remove any injected ad elements
      const adElements = document.querySelectorAll('[class*="pl-440431777cf8706fc842fbc5c0fa6156"]');
      adElements.forEach(el => el.remove());
      const adIframes = document.querySelectorAll('iframe[id*="container-440431777cf8706fc842fbc5c0fa6156"]');
      adIframes.forEach(el => el.remove());
    };
  }, [isPremium, loading, isAuthenticated]);

  return null;
};

export default AdsterraSocialBar;
