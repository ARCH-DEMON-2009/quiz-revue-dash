import { useEffect, useRef } from "react";
import { useAccessStatus } from "@/components/AccessGuard";

export const MonetagAds = () => {
  const { accessStatus, loading } = useAccessStatus();
  const scriptsLoadedRef = useRef(false);
  
  const isPremium = accessStatus?.type === 'premium';
  const isAuthenticated = accessStatus !== null && accessStatus.type !== 'none';

  useEffect(() => {
    // Wait for auth to complete loading
    if (loading) return;
    
    // Don't show ads to premium users - clean up any existing scripts
    if (isPremium) {
      // Remove Monetag scripts if they exist
      const monetagScripts = document.querySelectorAll('script[src*="nap5k.com"], script[src*="gizokraijaw.net"], script[src*="3nbf4.com"]');
      monetagScripts.forEach(script => script.remove());
      scriptsLoadedRef.current = false;
      return;
    }

    // Only load for authenticated non-premium users
    if (!isAuthenticated) return;

    // Prevent duplicate script loading
    if (scriptsLoadedRef.current) return;

    // Check if scripts already exist
    const existingScript1 = document.querySelector('script[src*="nap5k.com"]');
    const existingScript2 = document.querySelector('script[src*="gizokraijaw.net"]');
    const existingScript3 = document.querySelector('script[src*="3nbf4.com"]');
    
    if (existingScript1 && existingScript2 && existingScript3) {
      scriptsLoadedRef.current = true;
      return;
    }

    // Load Monetag scripts for free users
    const loadMonetagScripts = () => {
      // Script 1: Zone 10535146 (nap5k.com)
      if (!existingScript1) {
        const script1 = document.createElement('script');
        script1.dataset.zone = '10535146';
        script1.src = 'https://nap5k.com/tag.min.js';
        script1.async = true;
        document.body.appendChild(script1);
      }

      // Script 2: Vignette Zone 10535145 (gizokraijaw.net)
      if (!existingScript2) {
        const script2 = document.createElement('script');
        script2.dataset.zone = '10535145';
        script2.src = 'https://gizokraijaw.net/vignette.min.js';
        script2.async = true;
        document.body.appendChild(script2);
      }

      // Script 3: Zone 10535140 (3nbf4.com)
      if (!existingScript3) {
        const script3 = document.createElement('script');
        script3.src = 'https://3nbf4.com/act/files/tag.min.js?z=10535140';
        script3.dataset.cfasync = 'false';
        script3.async = true;
        document.body.appendChild(script3);
      }

      scriptsLoadedRef.current = true;
    };

    loadMonetagScripts();

    return () => {
      // Cleanup on unmount
      const monetagScripts = document.querySelectorAll('script[src*="nap5k.com"], script[src*="gizokraijaw.net"], script[src*="3nbf4.com"]');
      monetagScripts.forEach(script => script.remove());
      scriptsLoadedRef.current = false;
    };
  }, [isPremium, loading, isAuthenticated]);

  return null;
};

export default MonetagAds;
