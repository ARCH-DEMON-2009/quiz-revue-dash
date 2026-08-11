import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Award, HelpCircle, Crown, Tv, LogOut, User, Mail, Phone, Calendar, Check, X, Sparkles, Star, Shield } from "lucide-react";
import { useAdminBadgeConfig } from "@/hooks/useAdminBadgeConfig";
import { toast } from "sonner";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface UserDetails {
  id?: string;
  email?: string;
  name?: string;
  whatsapp?: string;
  createdAt?: string;
  avatarUrl?: string;
}

const AVATARS = [
  { id: 'f1', url: 'https://i.pinimg.com/736x/e4/32/12/e43212860a10e5e63c80c2ce5f76f8b3.jpg', premium: false },
  { id: 'f2', url: 'https://i.pinimg.com/736x/9c/f0/81/9cf08115f983cf802fde44e07b62413d.jpg', premium: false },
  { id: 'p1', url: 'https://i.pinimg.com/1200x/dd/f6/46/ddf6466855c93a74ed814ce66860e9a3.jpg', premium: true },
  { id: 'p2', url: 'https://i.pinimg.com/1200x/b1/ea/85/b1ea858dde1f60b3d7ff7ba62c7739f0.jpg', premium: true },
  { id: 'p3', url: 'https://i.pinimg.com/736x/15/1b/d1/151bd1fb461ab318a3b06a331c9e5d4d.jpg', premium: true },
  { id: 'p4', url: 'https://i.pinimg.com/736x/b8/81/01/b88101506ac0d03a27325247d1ef88d0.jpg', premium: true },
  { id: 'p5', url: 'https://i.pinimg.com/736x/9f/b1/c6/9fb1c6354e2b4261904d1762a60c2d4e.jpg', premium: true },
  { id: 'p6', url: 'https://i.pinimg.com/736x/02/af/aa/02afaabec94dc7ca657480d44c1eab78.jpg', premium: true },
  { id: 'p7', url: 'https://i.pinimg.com/736x/d7/ea/4b/d7ea4b7cdf6cb72e7e7d1c98df2774aa.jpg', premium: true },
  { id: 'p8', url: 'https://i.pinimg.com/1200x/c8/6f/2c/c86f2c7160dee9bb73c359051887dc15.jpg', premium: true },
  { id: 'p9', url: 'https://i.pinimg.com/736x/aa/20/dc/aa20dcdacd49131834639f61f8f8026d.jpg', premium: true },
  { id: 'p10', url: 'https://i.pinimg.com/736x/41/0c/ca/410ccab41a6ca4aa38a4de35da59bc43.jpg', premium: true },
  { id: 'p11', url: 'https://i.pinimg.com/736x/46/98/52/469852f2ac6c7ace80f5eb65a61aede2.jpg', premium: true },
];

interface Stats {
  totalTests: number;
  averageScore: number;
  overallAccuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  physicsAccuracy: number;
  chemistryAccuracy: number;
  mathsAccuracy: number;
}

interface AccessStatus {
  type: 'premium' | 'free';
  daysLeft: number;
  expiryDate: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<{url: string, premium: boolean} | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    averageScore: 0,
    overallAccuracy: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    physicsAccuracy: 0,
    chemistryAccuracy: 0,
    mathsAccuracy: 0,
  });
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const { 
    config,
    getAdminFrameStyles, 
    getAdminAvatarBorder, 
    getAdminBadgeIcon, 
    getAdminNameColor 
  } = useAdminBadgeConfig();

  useEffect(() => {
    fetchProfileData();
    checkAccessStatus();
    fetchUserDetails();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('is_admin');
    setIsAdmin(data === true);
  };

  const checkAccessStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check premium status
      const { data: premium } = await supabase
        .from("premium_users")
        .select("expiry_date, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (premium && new Date(premium.expiry_date) > new Date()) {
        const daysLeft = Math.ceil((new Date(premium.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        setAccessStatus({
          type: 'premium',
          daysLeft,
          expiryDate: premium.expiry_date
        });
        return;
      }

      // No premium - user has free access with ads
      setAccessStatus({
        type: 'free',
        daysLeft: 0,
        expiryDate: null
      });
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch from profile table for persistent avatar_url
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('avatar_url, name')
          .eq('user_id', user.id)
          .maybeSingle();

        setUserDetails({
          id: user.id,
          email: user.email,
          name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          whatsapp: user.user_metadata?.whatsapp_number || user.user_metadata?.whatsapp || user.user_metadata?.phone,
          createdAt: user.created_at,
          avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url
        });
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const handleAvatarClick = (url: string, isPremiumAvatar: boolean) => {
    if (isPremiumAvatar && accessStatus?.type !== 'premium') {
      setSelectedAvatar({ url, premium: isPremiumAvatar });
      setShowUpgradeModal(true);
      return;
    }
    setSelectedAvatar({ url, premium: isPremiumAvatar });
    setShowConfirmModal(true);
  };

  const confirmAvatarChange = async () => {
    if (!selectedAvatar) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: selectedAvatar.url })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserDetails(prev => prev ? { ...prev, avatarUrl: selectedAvatar.url } : null);
      
      // Update auth metadata too
      await supabase.auth.updateUser({
        data: { avatar_url: selectedAvatar.url }
      });

      toast.success("Avatar updated!");
      setShowConfirmModal(false);
      setSelectedAvatar(null);
    } catch (error: any) {
      toast.error("Failed to update avatar");
      console.error(error);
    }
  };


  const handleNameChange = async () => {
    if (!userDetails) return;
    const newName = prompt("Enter your new name:", userDetails.name);
    if (!newName || newName === userDetails.name) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ name: newName })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserDetails(prev => prev ? { ...prev, name: newName } : null);
      
      await supabase.auth.updateUser({
        data: { name: newName }
      });

      toast.success("Name updated!");
    } catch (error: any) {
      toast.error("Failed to update name");
      console.error(error);
    }
  };

  const fetchProfileData = async () => {
    try {
      const { data: results, error } = await supabase
        .from("test_results")
        .select("*")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      if (results && results.length > 0) {
        const totalTests = results.length;
        const avgScore = results.reduce((acc, r) => acc + r.percentage, 0) / totalTests;
        const totalQ = results.reduce((acc, r) => acc + r.total, 0);
        const correctQ = results.reduce((acc, r) => acc + r.correct, 0);
        const accuracy = totalQ > 0 ? (correctQ / totalQ) * 100 : 0;

        let physicsCorrect = 0, physicsTotal = 0;
        let chemistryCorrect = 0, chemistryTotal = 0;
        let mathsCorrect = 0, mathsTotal = 0;

        results.forEach(r => {
          const subStats = r.subject_stats as any || {};
          if (subStats.Physics) {
            physicsCorrect += subStats.Physics.correct || 0;
            physicsTotal += subStats.Physics.total || 0;
          }
          if (subStats.Chemistry) {
            chemistryCorrect += subStats.Chemistry.correct || 0;
            chemistryTotal += subStats.Chemistry.total || 0;
          }
          if (subStats.Maths || subStats.Mathematics) {
            const mathStats = subStats.Maths || subStats.Mathematics;
            mathsCorrect += mathStats.correct || 0;
            mathsTotal += mathStats.total || 0;
          }
        });

        setStats({
          totalTests,
          averageScore: avgScore,
          overallAccuracy: accuracy,
          totalQuestions: totalQ,
          correctAnswers: correctQ,
          physicsAccuracy: physicsTotal > 0 ? (physicsCorrect / physicsTotal) * 100 : 0,
          chemistryAccuracy: chemistryTotal > 0 ? (chemistryCorrect / chemistryTotal) * 100 : 0,
          mathsAccuracy: mathsTotal > 0 ? (mathsCorrect / mathsTotal) * 100 : 0,
        });

        setRecentTests(results.slice(0, 5));
      }
    } catch (error) {
      toast.error("Failed to load profile data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader />
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-2 flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}
          >
            <HelpCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Help & Support</span>
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl flex-1">
        {/* User Details Card */}
        {userDetails && (
          <Card className="mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-0">
              <CardTitle className="text-base sm:text-lg lg:text-xl flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 z-10 pointer-events-none overflow-visible">
                        {isAdmin ? (
                          ['f1', 'f2', 'f3'].includes(config.frame_type) ? (
                            <img src={`/frames/${config.frame_type}.png`} alt="Admin Frame" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] max-w-none object-contain" />
                          ) : (
                            <div className={getAdminFrameStyles(true) || ""} />
                          )
                        ) : accessStatus?.type === 'premium' ? (
                          <img src="/frames/f3.png" alt="Premium Frame" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] max-w-none object-contain" />
                        ) : null}
                      </div>
                      <div className={`relative h-16 w-16 rounded-full border-4 ${isAdmin && !['f1', 'f2', 'f3'].includes(config.frame_type) ? getAdminAvatarBorder(true) : 'border-transparent'} overflow-hidden bg-background shadow-lg z-0`}>
                        {userDetails.avatarUrl ? (
                          <img 
                            src={userDetails.avatarUrl} 
                            alt={userDetails.name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                          </div>
                        )}
                      </div>
                      {isAdmin ? (
                        <div className="absolute -top-4 -right-4 w-12 h-12 z-10 animate-pulse">
                          {['b1', 'b2', 'b3'].includes(getAdminBadgeIcon(true) || "") ? (
                            <img src={`/badges/${getAdminBadgeIcon(true)}.png`} alt="Admin Badge" className="w-full h-full object-contain" />
                          ) : getAdminBadgeIcon(true) === 'shield' ? (
                            <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                              <Shield className="h-4 w-4 text-white fill-white" />
                            </div>
                          ) : getAdminBadgeIcon(true) === 'crown' ? (
                            <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                              <Crown className="h-4 w-4 text-white fill-white" />
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-red-600 to-purple-700 rounded-full p-1 border-2 border-white shadow-lg">
                              <Star className="h-4 w-4 text-white fill-white" />
                            </div>
                          )}
                        </div>
                      ) : accessStatus?.type === 'premium' ? (
                        <div className="absolute -top-4 -right-4 z-10">
                          <img src="/badges/b1.png" alt="Premium Badge" className="w-10 h-10 object-contain" />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${isAdmin ? getAdminNameColor(true) : accessStatus?.type === 'premium' ? 'text-amber-500' : ''}`}>{userDetails.name}</h2>
                      <p className="text-sm text-muted-foreground">{userDetails.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNameChange}
                      className="gap-2"
                    >
                      <User className="h-4 w-4" />
                      Edit Name
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {showAvatarSelector ? "Hide List" : "Change Avatar"}
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-4">
              <div className="space-y-4">
                {showAvatarSelector && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-muted-foreground">Select Avatar</p>
                      {accessStatus?.type !== 'premium' && (
                        <Button variant="link" size="sm" className="text-amber-600 h-auto p-0" onClick={() => navigate("/pricing")}>
                          Buy Premium to unlock all
                        </Button>
                      )}
                      <Button variant="link" size="sm" className="text-primary h-auto p-0" onClick={() => window.open("https://t.me/TestSagarHelpRobot", "_blank")}>
                        Demand Custom Avatar
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
                      {AVATARS.map((avatar) => (
                        <div 
                          key={avatar.id}
                          onClick={() => handleAvatarClick(avatar.url, avatar.premium)}
                          className={`relative cursor-pointer group rounded-full p-0.5 border-2 transition-all duration-300 ${
                            userDetails.avatarUrl === avatar.url 
                              ? 'border-primary shadow-lg shadow-primary/20 scale-105' 
                              : 'border-transparent hover:border-primary/30'
                          } ${avatar.premium && accessStatus?.type !== 'premium' ? 'opacity-50 grayscale hover:opacity-70' : ''}`}
                        >
                          <img 
                            src={avatar.url} 
                            alt="Avatar option" 
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${avatar.id}`;
                            }}
                          />
                          {avatar.premium && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-md">
                              <Crown className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</p>
                    <p className="text-sm font-medium truncate">{userDetails.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                    <p className="text-sm font-medium truncate">{userDetails.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">WhatsApp</p>
                    <p className="text-sm font-medium truncate">{userDetails.whatsapp || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Joined</p>
                    <p className="text-sm font-medium">
                      {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Identity preview: how you appear on leaderboards and in PDFs */}
        {userDetails && (
          <div className="mb-4 sm:mb-6 lg:mb-8 max-w-xl">
            <IdentityPreviewCard
              name={userDetails.name}
              avatarUrl={userDetails.avatarUrl}
              isAdmin={isAdmin}
              isPremium={accessStatus?.type === 'premium'}
              adminFrame={config.frame_type}
              adminBadge={getAdminBadgeIcon(true) || undefined}
            />
          </div>
        )}



        {/* Access Status Card */}
        {accessStatus && (
          <Card className={`mb-4 sm:mb-6 lg:mb-8 ${accessStatus.type === 'premium' ? 'border-primary' : 'border-muted-foreground/30'}`}>
            <CardContent className="p-3 sm:p-4 lg:pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  {accessStatus.type === 'premium' ? (
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                  ) : (
                    <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold">
                        {accessStatus.type === 'premium' ? 'Premium Active' : 'Free Plan (with Ads)'}
                      </h3>
                      <Badge variant={accessStatus.type === 'premium' ? 'default' : 'secondary'} className="text-xs">
                        {accessStatus.type === 'premium' ? `${accessStatus.daysLeft} days left` : 'Ad-Supported'}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {accessStatus.type === 'premium' 
                        ? `Expires: ${new Date(accessStatus.expiryDate!).toLocaleDateString()}`
                        : 'Upgrade to Premium for an ad-free experience'}
                    </p>
                  </div>
                </div>
                {accessStatus.type === 'free' && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                    <Link to="/pricing">
                      <Button size="sm" className="w-full sm:w-auto gap-2">
                        <Crown className="h-4 w-4" />
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Your Performance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your progress and achievements</p>
        </div>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading profile...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.overallAccuracy.toFixed(1)}%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-success/10">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.totalTests}</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Tests Taken</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 rounded-lg bg-warning/10">
                      <Award className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stats.averageScore.toFixed(1)}%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Physics</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.physicsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.physicsAccuracy} className="h-2 sm:h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Chemistry</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.chemistryAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.chemistryAccuracy} className="h-2 sm:h-3" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm sm:text-base font-medium">Mathematics</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stats.mathsAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.mathsAccuracy} className="h-2 sm:h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Recent Tests</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                {recentTests.length === 0 ? (
                  <p className="text-center text-sm sm:text-base text-muted-foreground py-6 sm:py-8">No tests taken yet</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {recentTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer gap-3"
                        onClick={() => navigate(`/results/${test.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base mb-1 truncate">{test.test_name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span>{test.correct}/{test.total} correct</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{test.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg sm:text-2xl font-bold ${
                            test.percentage >= 75 ? "text-success" :
                            test.percentage >= 50 ? "text-warning" : "text-destructive"
                          }`}>
                            {test.percentage.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm New Avatar</DialogTitle>
            <DialogDescription>
              This is how your profile picture will appear on the leaderboard and header.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6 gap-6">
            <div className="relative">
              <div className="h-32 w-32 rounded-full border-4 border-primary/20 p-1 shadow-2xl overflow-hidden">
                <img 
                  src={selectedAvatar?.url} 
                  alt="Preview" 
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              {selectedAvatar?.premium && (
                <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-2 shadow-lg ring-2 ring-white">
                  <Crown className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Header Preview</p>
              <div className="h-10 w-10 rounded-full border border-primary/20 overflow-hidden shadow-md">
                <img 
                  src={selectedAvatar?.url} 
                  alt="Header Preview" 
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={confirmAvatarChange} className="bg-primary text-white shadow-lg hover:shadow-primary/30 transition-all">
              <Check className="h-4 w-4 mr-2" />
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Premium Avatar Locked
            </DialogTitle>
            <DialogDescription>
              This is a premium avatar. Upgrade your account to unlock all premium avatars and exclusive profile frames!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            {selectedAvatar && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-full animate-pulse blur-md opacity-50" />
                <img 
                  src={selectedAvatar.url} 
                  alt="Premium Preview" 
                  className="relative h-32 w-32 rounded-full border-4 border-amber-500 object-cover shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-2 border-2 border-background shadow-lg">
                  <Crown className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
            <p className="text-center text-sm font-medium text-amber-600 px-4">
              Unlock professional looks and stand out on the leaderboard with golden names and special frames!
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)} className="sm:flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={() => navigate("/pricing")} 
              className="sm:flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2 shadow-lg shadow-amber-500/20"
            >
              <Crown className="h-4 w-4" />
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Profile;
