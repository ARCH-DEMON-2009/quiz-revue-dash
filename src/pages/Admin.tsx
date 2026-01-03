import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Crown, Clock, LogOut, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { AddPremiumUserDialog } from "@/components/AddPremiumUserDialog";

interface UserData {
  user_id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
  is_blocked: boolean;
  member_since: string;
  total_tests: number;
  average_score: number;
  account_type: "premium" | "trial" | "expired";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      // Fetch all premium users with active status and valid expiry
      const { data: premiumUsers, error: premiumError } = await supabase
        .from("premium_users")
        .select("user_id, email, expiry_date, status")
        .eq("status", "active");

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
      const combinedUsers: UserData[] = (profiles || []).map((profile) => {
        const userId = profile.user_id || profile.id;
        const email = (profile.email || "").toLowerCase();
        
        // Check premium by user_id first, then by email
        const premiumExpiry = premiumByUserId.get(userId) || premiumByEmail.get(email);
        const isPremium = !!premiumExpiry;
        
        // Check trial by user_id first, then by email
        const trialStart = trialByUserId.get(userId) || trialByEmail.get(email);
        const isTrial = !!trialStart;
        
        const stats = userStats.get(userId) || { total: 0, avgScore: 0 };

        let accountType: "premium" | "trial" | "expired" = "expired";
        if (isPremium) {
          accountType = "premium";
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
          name: profile.name || "Unknown",
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
      filtered = filtered.filter((u) => u.account_type === "trial");
    } else if (activeTab === "expired") {
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
    trial: users.filter((u) => u.account_type === "trial").length,
    expired: users.filter((u) => u.account_type === "expired").length,
    blocked: users.filter((u) => u.is_blocked).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Admin Panel</h1>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground">
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
                                        : "destructive"
                                    }
                                  >
                                    {user.account_type === "expired" ? "Expired Trial" : user.account_type}
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
      </main>
    </div>
  );
};

export default Admin;
