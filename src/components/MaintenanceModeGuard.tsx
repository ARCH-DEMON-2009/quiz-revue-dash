import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MaintenancePage from "@/pages/MaintenancePage";

interface MaintenanceModeGuardProps {
  children: React.ReactNode;
}

export const MaintenanceModeGuard = ({ children }: MaintenanceModeGuardProps) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceAndAdmin();
  }, []);

  const checkMaintenanceAndAdmin = async () => {
    try {
      // Check maintenance mode status
      const { data: configData } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "maintenance_mode")
        .single();

      const maintenanceEnabled = configData?.config_value === "true";
      setIsMaintenanceMode(maintenanceEnabled);

      // If maintenance mode is on, check if user is admin
      if (maintenanceEnabled) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: adminData } = await supabase.rpc('is_admin');
          setIsAdmin(adminData === true);
        }
      }
    } catch (error) {
      console.error("Error checking maintenance mode:", error);
      // If we can't check, assume not in maintenance mode
      setIsMaintenanceMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Show maintenance page if maintenance mode is on AND user is not admin
  if (isMaintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
};
