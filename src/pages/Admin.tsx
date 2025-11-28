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
import { Search, Users, Crown, Clock, LogOut } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  user_id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
  is_blocked: boolean;
  member_since: string;
  total_tests: number;
  average_score: number;
  account_type: "premium" | "trial" | "free";
  premium_expiry: string | null;
  trial_start: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const adminAuth = sessionStorage.getItem("adminAuth");
    if (adminAuth === "authenticated") {
      setIsAuthenticated(true);
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, activeTab]);

  const handleLogin = () => {
    if (password === "admin123") {
      sessionStorage.setItem("adminAuth", "authenticated");
      setIsAuthenticated(true);
      fetchUsers();
      toast.success("Welcome to Admin Panel");
    } else {
      toast.error("Invalid password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
    setPassword("");
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users from user_profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      // Fetch premium users
      const { data: premiumUsers, error: premiumError } = await supabase
        .from("premium_users")
        .select("user_id, expiry_date");

      if (premiumError) {
        console.error("Premium users error:", premiumError);
      }

      // Fetch trial users
      const { data: trialUsers, error: trialError } = await supabase
        .from("user_trials")
        .select("user_id, start_date");

      if (trialError) {
        console.error("Trial users error:", trialError);
      }

      // Fetch test results for stats
      const { data: testResults, error: resultsError } = await supabase
        .from("test_results")
        .select("user_id, percentage");

      if (resultsError) {
        console.error("Results error:", resultsError);
      }

      // Create lookup maps
      const premiumMap = new Map(
        (premiumUsers || []).map((p) => [p.user_id, p.expiry_date])
      );
      const trialMap = new Map(
        (trialUsers || []).map((t) => [t.user_id, t.start_date])
      );

      // Calculate stats per user
      const userStats = new Map<string, { total: number; avgScore: number }>();
      (testResults || []).forEach((r) => {
        if (!r.user_id) return;
        const existing = userStats.get(r.user_id) || { total: 0, avgScore: 0 };
        const newTotal = existing.total + 1;
        const newAvg =
          (existing.avgScore * existing.total + (r.percentage || 0)) / newTotal;
        userStats.set(r.user_id, { total: newTotal, avgScore: newAvg });
      });

      // Map profiles to UserData
      const combinedUsers: UserData[] = (profiles || []).map((profile) => {
        const isPremium = premiumMap.has(profile.user_id);
        const premiumExpiry = premiumMap.get(profile.user_id);
        const isTrial = trialMap.has(profile.user_id);
        const trialStart = trialMap.get(profile.user_id);
        const stats = userStats.get(profile.user_id || "") || {
          total: 0,
          avgScore: 0,
        };

        let accountType: "premium" | "trial" | "free" = "free";
        if (isPremium && premiumExpiry && new Date(premiumExpiry) > new Date()) {
          accountType = "premium";
        } else if (isTrial) {
          accountType = "trial";
        }

        return {
          user_id: profile.user_id || profile.id,
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

      console.log("Fetched users:", combinedUsers.length);
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

    // Filter by tab
    if (activeTab === "premium") {
      filtered = filtered.filter((u) => u.account_type === "premium");
    } else if (activeTab === "trial") {
      filtered = filtered.filter((u) => u.account_type === "trial");
    } else if (activeTab === "blocked") {
      filtered = filtered.filter((u) => u.is_blocked);
    }

    // Filter by search query
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
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
    blocked: users.filter((u) => u.is_blocked).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Premium Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-3xl font-bold">{stats.premium}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trial Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">{stats.trial}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Blocked Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-destructive">{stats.blocked}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or WhatsApp number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
                <TabsTrigger value="trial">Trial</TabsTrigger>
                <TabsTrigger value="blocked">Blocked</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  </div>
                ) : (
                  <div className="rounded-md border">
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
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
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
                                      : "outline"
                                  }
                                >
                                  {user.account_type}
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
