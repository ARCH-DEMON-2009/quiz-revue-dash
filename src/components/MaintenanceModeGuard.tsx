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
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  useEffect(() => {
    checkMaintenanceMode();
    
    // Listen for auth state changes to recheck admin status
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMaintenanceMode) {
        checkAdminStatus();
      }
    });

    // Set up interval to check scheduled maintenance every minute
    const intervalId = setInterval(() => {
      checkMaintenanceMode();
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      // Fetch all maintenance-related config
      const { data: configData, error } = await supabase
        .from("system_config")
        .select("config_key, config_value")
        .in("config_key", ["maintenance_mode", "maintenance_scheduled_start", "maintenance_scheduled_end"]);

      if (error) {
        console.error("Error fetching maintenance mode:", error);
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      let manualMaintenanceOn = false;
      let scheduledStart: Date | null = null;
      let scheduledEnd: Date | null = null;

      configData?.forEach((config) => {
        if (config.config_key === "maintenance_mode") {
          manualMaintenanceOn = config.config_value === "true";
        } else if (config.config_key === "maintenance_scheduled_start" && config.config_value) {
          const date = new Date(config.config_value);
          if (!isNaN(date.getTime())) {
            scheduledStart = date;
          }
        } else if (config.config_key === "maintenance_scheduled_end" && config.config_value) {
          const date = new Date(config.config_value);
          if (!isNaN(date.getTime())) {
            scheduledEnd = date;
          }
        }
      });

      // Check if we're within scheduled maintenance window
      let scheduledMaintenanceActive = false;
      const now = new Date();
      
      if (scheduledStart && scheduledEnd) {
        scheduledMaintenanceActive = now >= scheduledStart && now <= scheduledEnd;
      }

      const maintenanceEnabled = manualMaintenanceOn || scheduledMaintenanceActive;
      setIsMaintenanceMode(maintenanceEnabled);

      // If maintenance mode is on, check if current user is admin
      if (maintenanceEnabled) {
        await checkAdminStatus();
      }
    } catch (error) {
      console.error("Error checking maintenance mode:", error);
      setIsMaintenanceMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    setIsCheckingAdmin(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: adminData, error } = await supabase.rpc('is_admin');
        if (!error) {
          setIsAdmin(adminData === true);
        } else {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // Show loading spinner while checking maintenance mode
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