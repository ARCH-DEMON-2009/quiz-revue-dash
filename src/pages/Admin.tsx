import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Users, Crown, Clock, LogOut, ChevronLeft, ChevronRight, Send, Settings, Wrench, CalendarIcon, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddPremiumUserDialog } from "@/components/AddPremiumUserDialog";
import { ManagePremiumDialog } from "@/components/ManagePremiumDialog";
import { PromoCodeManager } from "@/components/PromoCodeManager";
import { BypassBlocksSection } from "@/components/BypassBlocksSection";

export interface UserData {
  user_id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
  is_blocked: boolean;
  member_since: string;
  total_tests: number;
  average_score: number;
  account_type: "premium" | "trial" | "expired" | "new";
  premium_expiry: string | null;
  trial_start: string | null;
}

const ITEMS_PER_PAGE = 20;

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [scheduledStart, setScheduledStart] = useState<Date | undefined>(undefined);
  const [scheduledEnd, setScheduledEnd] = useState<Date | undefined>(undefined);
  const [scheduledStartTime, setScheduledStartTime] = useState("00:00");
  const [scheduledEndTime, setScheduledEndTime] = useState("00:00");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [shortenerLink, setShortenerLink] = useState("");
  const [shortenerLoading, setShortenerLoading] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role using the is_admin function
      const { data: isAdmin, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error("Error checking admin status:", error);
        toast.error("Failed to verify admin access");
        navigate("/");
        return;
      }

      if (!isAdmin) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAuthenticated(true);
      fetchUsers();
      fetchSubjects();
      fetchMaintenanceMode();
      fetchShortenerLink();
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterUsers();
    setCurrentPage(1);
  }, [searchQuery, users, activeTab]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("subject")
        .neq("subject", null);

      if (error) throw error;
      
      const uniqueSubjects = [...new Set((data || []).map(q => q.subject))].filter(Boolean);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchMaintenanceMode = async () => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("config_key, config_value")
        .in("config_key", ["maintenance_mode", "maintenance_scheduled_start", "maintenance_scheduled_end"]);

      if (error) throw error;
      
      data?.forEach((config) => {
        if (config.config_key === "maintenance_mode") {
          setMaintenanceMode(config.config_value === "true");
        } else if (config.config_key === "maintenance_scheduled_start" && config.config_value) {
          const date = new Date(config.config_value);
          if (!isNaN(date.getTime())) {
            setScheduledStart(date);
            setScheduledStartTime(format(date, "HH:mm"));
          }
        } else if (config.config_key === "maintenance_scheduled_end" && config.config_value) {
          const date = new Date(config.config_value);
          if (!isNaN(date.getTime())) {
            setScheduledEnd(date);
            setScheduledEndTime(format(date, "HH:mm"));
          }
        }
      });
    } catch (error) {
      console.error("Error fetching maintenance mode:", error);
    }
  };

  const toggleMaintenanceMode = async () => {
    setMaintenanceLoading(true);
    try {
      const newValue = !maintenanceMode;
      const { error } = await supabase
        .from("system_config")
        .update({ config_value: newValue.toString(), updated_at: new Date().toISOString() })
        .eq("config_key", "maintenance_mode");

      if (error) throw error;
      
      setMaintenanceMode(newValue);
      toast.success(`Maintenance mode ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      toast.error("Failed to toggle maintenance mode");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const saveScheduledMaintenance = async () => {
    setScheduleLoading(true);
    try {
      // Combine date and time for start
      let startISO = "";
      if (scheduledStart) {
        const [hours, minutes] = scheduledStartTime.split(":").map(Number);
        const startDate = new Date(scheduledStart);
        startDate.setHours(hours, minutes, 0, 0);
        startISO = startDate.toISOString();
      }

      // Combine date and time for end
      let endISO = "";
      if (scheduledEnd) {
        const [hours, minutes] = scheduledEndTime.split(":").map(Number);
        const endDate = new Date(scheduledEnd);
        endDate.setHours(hours, minutes, 0, 0);
        endISO = endDate.toISOString();
      }

      // Validate that end is after start if both are set
      if (startISO && endISO && new Date(endISO) <= new Date(startISO)) {
        toast.error("End time must be after start time");
        setScheduleLoading(false);
        return;
      }

      const { error: startError } = await supabase
        .from("system_config")
        .update({ config_value: startISO, updated_at: new Date().toISOString() })
        .eq("config_key", "maintenance_scheduled_start");

      const { error: endError } = await supabase
        .from("system_config")
        .update({ config_value: endISO, updated_at: new Date().toISOString() })
        .eq("config_key", "maintenance_scheduled_end");

      if (startError || endError) throw startError || endError;

      toast.success("Scheduled maintenance saved successfully");
    } catch (error) {
      console.error("Error saving scheduled maintenance:", error);
      toast.error("Failed to save scheduled maintenance");
    } finally {
      setScheduleLoading(false);
    }
  };

  const clearScheduledMaintenance = async () => {
    setScheduleLoading(true);
    try {
      const { error: startError } = await supabase
        .from("system_config")
        .update({ config_value: "", updated_at: new Date().toISOString() })
        .eq("config_key", "maintenance_scheduled_start");

      const { error: endError } = await supabase
        .from("system_config")
        .update({ config_value: "", updated_at: new Date().toISOString() })
        .eq("config_key", "maintenance_scheduled_end");

      if (startError || endError) throw startError || endError;

      setScheduledStart(undefined);
      setScheduledEnd(undefined);
      setScheduledStartTime("00:00");
      setScheduledEndTime("00:00");
      toast.success("Scheduled maintenance cleared");
    } catch (error) {
      console.error("Error clearing scheduled maintenance:", error);
      toast.error("Failed to clear scheduled maintenance");
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchShortenerLink = async () => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "shortener_link")
        .maybeSingle();

      if (error) throw error;
      if (data?.config_value) {
        setShortenerLink(data.config_value);
      }
    } catch (error) {
      console.error("Error fetching shortener link:", error);
    }
  };

  const saveShortenerLink = async () => {
    setShortenerLoading(true);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({ config_value: shortenerLink, updated_at: new Date().toISOString() })
        .eq("config_key", "shortener_link");

      if (error) throw error;
      toast.success("Shortener link updated successfully");
    } catch (error) {
      console.error("Error saving shortener link:", error);
      toast.error("Failed to update shortener link");
    } finally {
      setShortenerLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles - use range to get all records beyond default 1000 limit
      let allProfiles: any[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("*")
          .range(from, from + batchSize - 1);

        if (profilesError) {
          console.error("Profiles error:", profilesError);
          throw profilesError;
        }
        
        if (!profiles || profiles.length === 0) break;
        allProfiles = [...allProfiles, ...profiles];
        if (profiles.length < batchSize) break;
        from += batchSize;
      }

      // Fetch ALL premium users (active and inactive) to track expired ones too
      const { data: premiumUsers, error: premiumError } = await supabase
        .from("premium_users")
        .select("user_id, email, expiry_date, status");

      if (premiumError) console.error("Premium users error:", premiumError);

      // Fetch all trial users
      const { data: trialUsers, error: trialError } = await supabase
        .from("user_trials")
        .select("user_id, start_date, email");

      if (trialError) {
        console.error("Trial users error:", trialError);
      } else {
        console.log(`Fetched ${trialUsers?.length || 0} trial users`);
      }

      // Fetch all test results
      const { data: testResults, error: resultsError } = await supabase
        .from("test_results")
        .select("user_id, percentage");

      if (resultsError) console.error("Results error:", resultsError);

      // Create maps for quick lookups - use email as fallback key
      const premiumByUserId = new Map<string, string>();
      const premiumByEmail = new Map<string, string>();
      
      (premiumUsers || []).forEach((p) => {
        const isValid = p.expiry_date && new Date(p.expiry_date) > new Date();
        if (isValid) {
          if (p.user_id) premiumByUserId.set(p.user_id, p.expiry_date);
          if (p.email) premiumByEmail.set(p.email.toLowerCase(), p.expiry_date);
        }
      });

      const trialByUserId = new Map<string, string>();
      const trialByEmail = new Map<string, string>();
      
      (trialUsers || []).forEach((t) => {
        if (t.user_id) trialByUserId.set(t.user_id, t.start_date);
        if (t.email) trialByEmail.set(t.email.toLowerCase(), t.start_date);
      });

      // Calculate user stats
      const userStats = new Map<string, { total: number; avgScore: number }>();
      (testResults || []).forEach((r) => {
        if (!r.user_id) return;
        const existing = userStats.get(r.user_id) || { total: 0, avgScore: 0 };
        const newTotal = existing.total + 1;
        const newAvg =
          (existing.avgScore * existing.total + (r.percentage || 0)) / newTotal;
        userStats.set(r.user_id, { total: newTotal, avgScore: newAvg });
      });

      // Combine all data
      const combinedUsers: UserData[] = allProfiles.map((profile) => {
        const userId = profile.user_id || profile.id;
        const email = (profile.email || "").toLowerCase();
        
        // Check premium by user_id first, then by email
        const premiumExpiry = premiumByUserId.get(userId) || premiumByEmail.get(email);
        const isPremium = !!premiumExpiry;
        
        // Check trial by user_id first, then by email
        const trialStart = trialByUserId.get(userId) || trialByEmail.get(email);
        const isTrial = !!trialStart;
        
        const stats = userStats.get(userId) || { total: 0, avgScore: 0 };

        // Check if premium was expired (user has premium record but it's expired)
        const expiredPremium = (premiumUsers || []).find(p => 
          (p.user_id === userId || (p.email && p.email.toLowerCase() === email)) &&
          p.expiry_date && new Date(p.expiry_date) <= new Date()
        );
        const hasPremiumExpired = !!expiredPremium;

        let accountType: "premium" | "trial" | "expired" | "new" = "new";
        if (isPremium) {
          accountType = "premium";
        } else if (hasPremiumExpired) {
          // Premium expired
          accountType = "expired";
        } else if (isTrial && trialStart) {
          // Check if trial is still valid (3 days)
          const trialStartDate = new Date(trialStart);
          const trialEndDate = new Date(trialStartDate.getTime() + 3 * 24 * 60 * 60 * 1000);
          const now = new Date();
          if (trialEndDate > now) {
            accountType = "trial";
          } else {
            accountType = "expired"; // Trial expired
          }
        }

        return {
          user_id: userId,
          name: profile.name,
          email: profile.email || "",
          whatsapp_number: profile.whatsapp_number,
          is_blocked: profile.is_blocked || false,
          member_since: profile.created_at || new Date().toISOString(),
          total_tests: stats.total,
          average_score: stats.avgScore,
          account_type: accountType,
          premium_expiry: premiumExpiry || null,
          trial_start: trialStart || null,
        };
      });

      const trialCount = combinedUsers.filter(u => u.account_type === 'trial').length;
      const expiredCount = combinedUsers.filter(u => u.account_type === 'expired').length;
      console.log(`Loaded ${combinedUsers.length} users: ${combinedUsers.filter(u => u.account_type === 'premium').length} premium, ${trialCount} trial, ${expiredCount} expired`);
      console.log("Trial users sample:", combinedUsers.filter(u => u.account_type === 'trial').slice(0, 3));

      setUsers(combinedUsers);
      setFilteredUsers(combinedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (activeTab === "premium") {
      filtered = filtered.filter((u) => u.account_type === "premium");
    } else if (activeTab === "trial") {
      // Show ONLY users with active trial (not expired, not new, not premium)
      filtered = filtered.filter((u) => 
        !u.is_blocked && 
        u.account_type === "trial"
      );
    } else if (activeTab === "expired") {
      // Show users with expired trial or expired premium
      filtered = filtered.filter((u) => u.account_type === "expired");
    } else if (activeTab === "blocked") {
      filtered = filtered.filter((u) => u.is_blocked);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (u.whatsapp_number && u.whatsapp_number.includes(query))
      );
    }

    setFilteredUsers(filtered);
  };

  const handleBlockToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_blocked: !currentStatus })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, is_blocked: !currentStatus } : u
        )
      );
      toast.success(`User ${!currentStatus ? "blocked" : "unblocked"} successfully`);
    } catch (error) {
      console.error("Error updating block status:", error);
      toast.error("Failed to update user status");
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You need admin privileges to access this page.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Login with Admin Account
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: users.length,
    premium: users.filter((u) => u.account_type === "premium").length,
    trial: users.filter((u) => !u.is_blocked && u.account_type === "trial").length,
    expired: users.filter((u) => u.account_type === "expired").length,
    blocked: users.filter((u) => u.is_blocked).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Admin Panel</h1>
            {maintenanceMode && (
              <Badge variant="destructive" className="animate-pulse">
                <Wrench className="h-3 w-3 mr-1" />
                Maintenance Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Maintenance Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
              <Wrench className={`h-3 w-3 sm:h-4 sm:w-4 ${maintenanceMode ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className="text-xs sm:text-sm hidden sm:inline">Maintenance</span>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={toggleMaintenanceMode}
                disabled={maintenanceLoading}
              />
            </div>
            <AddPremiumUserDialog onSuccess={fetchUsers} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                toast.info("Checking trial expiry notifications...");
                try {
                  const { data, error } = await supabase.functions.invoke('send-trial-expiry-notification');
                  if (error) throw error;
                  toast.success(`Found ${data?.count || 0} users to notify`);
                  console.log("Notification data:", data);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to check notifications");
                }
              }}
              className="text-xs sm:text-sm"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Check Expiry</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <Card>
            <CardHeader className="p-3 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Premium
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.premium}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Active Trial
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.trial}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-warning">{stats.expired}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Maintenance Card */}
        <Card className="mb-3 sm:mb-4">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Scheduled Maintenance
              {(scheduledStart || scheduledEnd) && (
                <Badge variant="secondary" className="ml-2">
                  {scheduledStart && scheduledEnd ? "Scheduled" : "Incomplete"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date/Time */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium">Start Date & Time</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal text-xs sm:text-sm",
                          !scheduledStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledStart ? format(scheduledStart, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledStart}
                        onSelect={setScheduledStart}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-24 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* End Date/Time */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium">End Date & Time</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal text-xs sm:text-sm",
                          !scheduledEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledEnd ? format(scheduledEnd, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledEnd}
                        onSelect={setScheduledEnd}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    className="w-24 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Info */}
            {scheduledStart && scheduledEnd && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs sm:text-sm">
                <p className="text-muted-foreground">
                  Maintenance will automatically activate from{" "}
                  <span className="font-medium text-foreground">
                    {format(new Date(`${format(scheduledStart, "yyyy-MM-dd")}T${scheduledStartTime}`), "PPP 'at' p")}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {format(new Date(`${format(scheduledEnd, "yyyy-MM-dd")}T${scheduledEndTime}`), "PPP 'at' p")}
                  </span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={saveScheduledMaintenance}
                disabled={scheduleLoading || (!scheduledStart && !scheduledEnd)}
                size="sm"
                className="text-xs sm:text-sm"
              >
                {scheduleLoading ? "Saving..." : "Save Schedule"}
              </Button>
              {(scheduledStart || scheduledEnd) && (
                <Button
                  variant="outline"
                  onClick={clearScheduledMaintenance}
                  disabled={scheduleLoading}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shortener Link Config */}
        <Card className="mb-3 sm:mb-4">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Verification Shortener Link
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              This is the shortened URL that free users click to verify their access. Change it here to update site-wide.
            </p>
            <div className="flex gap-2">
              <Input
                value={shortenerLink}
                onChange={(e) => setShortenerLink(e.target.value)}
                placeholder="https://your-shortener-link.com"
                className="flex-1 text-xs sm:text-sm"
              />
              <Button
                onClick={saveShortenerLink}
                disabled={shortenerLoading}
                size="sm"
                className="text-xs sm:text-sm"
              >
                {shortenerLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subject Filter */}
        <Card className="mb-3 sm:mb-4">
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Filter by Subject</label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 sm:pl-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 text-xs sm:text-sm h-auto">
                <TabsTrigger value="all" className="py-1.5 sm:py-2 px-1 sm:px-3">All</TabsTrigger>
                <TabsTrigger value="premium" className="py-1.5 sm:py-2 px-1 sm:px-3">Premium</TabsTrigger>
                <TabsTrigger value="trial" className="py-1.5 sm:py-2 px-1 sm:px-3">Trial</TabsTrigger>
                <TabsTrigger value="expired" className="py-1.5 sm:py-2 px-1 sm:px-3">Expired</TabsTrigger>
                <TabsTrigger value="blocked" className="py-1.5 sm:py-2 px-1 sm:px-3">Blocked</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Tests</TableHead>
                            <TableHead>Avg Score</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Block</TableHead>
                            <TableHead>Manage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground">
                                No users found
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map((user) => (
                              <TableRow key={user.user_id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.whatsapp_number || "N/A"}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      user.account_type === "premium"
                                        ? "default"
                                        : user.account_type === "trial"
                                        ? "secondary"
                                        : user.account_type === "new"
                                        ? "outline"
                                        : "destructive"
                                    }
                                  >
                                    {user.account_type === "expired" ? "Expired" : user.account_type === "new" ? "New User" : user.account_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{user.total_tests}</TableCell>
                                <TableCell>{user.average_score.toFixed(1)}%</TableCell>
                                <TableCell>
                                  {new Date(user.member_since).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={user.is_blocked}
                                    onCheckedChange={() =>
                                      handleBlockToggle(user.user_id, user.is_blocked)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setManageDialogOpen(true);
                                    }}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                          {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
                          {filteredUsers.length} users
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Promo Code Manager */}
        <div className="mt-8">
          <PromoCodeManager />
        </div>

        {/* Bypass Block Attempts */}
        <BypassBlocksSection />
      </main>

      <ManagePremiumDialog
        user={selectedUser}
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default Admin;
