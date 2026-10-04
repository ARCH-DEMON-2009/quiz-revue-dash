import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Quiz = lazy(() => import("./pages/Quiz"));
const QuizRedirect = lazy(() => import("./pages/QuizRedirect"));
const Results = lazy(() => import("./pages/Results"));
const Review = lazy(() => import("./pages/Review"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicUserProfile = lazy(() => import("./pages/PublicUserProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Verify = lazy(() => import("./pages/Verify"));
const TncTests = lazy(() => import("./pages/TncTests"));
const TncQuiz = lazy(() => import("./pages/TncQuiz"));
const TncLeaderboard = lazy(() => import("./pages/TncLeaderboard"));
const TncGlobalLeaderboard = lazy(() => import("./pages/TncGlobalLeaderboard"));
const TncSharedResult = lazy(() => import("./pages/TncSharedResult"));
const TncRetry = lazy(() => import("./pages/TncRetry"));
const TncStudyPlan = lazy(() => import("./pages/TncStudyPlan"));
const InstitutionTests = lazy(() => import("./pages/InstitutionTests"));
const AttemptComparison = lazy(() => import("./pages/AttemptComparison"));
import StudyFeaturesWelcome from "./components/StudyFeaturesWelcome";
const RoutesIndex = lazy(() => import("./routes/index"));




import { BlockedUserGuard } from "./components/BlockedUserGuard";
import { BypassBlockGuard } from "./components/BypassBlockGuard";
import { MaintenanceModeGuard } from "./components/MaintenanceModeGuard";

import AppErrorBoundary from "./components/AppErrorBoundary";
import AvatarOnboardingPrompt from "./components/AvatarOnboardingPrompt";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const setupCapacitor = async () => {
      if (!Capacitor.isNativePlatform()) return;

      // Handle Android hardware back button
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });

      // Configure Status Bar
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' }); // Deep indigo from theme
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    };

    setupCapacitor();

    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, []);

  return (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AvatarOnboardingPrompt />
        
        <MaintenanceModeGuard>
          <BypassBlockGuard />
          <BlockedUserGuard />
          <Suspense fallback={(
            <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-muted-foreground" role="status">
              Loading page...
            </div>
          )}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/quiz/:testId" element={<Quiz />} />
            <Route path="/quiz" element={<QuizRedirect />} />
            <Route path="/quiz.html" element={<QuizRedirect />} />
            <Route path="/results/:resultId" element={<Results />} />
            <Route path="/review/:resultId" element={<Review />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users/:userId" element={<PublicUserProfile />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/comparison" element={<AttemptComparison />} />

            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/institutions" element={<InstitutionTests />} />
            <Route path="/tnc-tests" element={<TncTests />} />
            <Route path="/tnc-tests/leaderboard" element={<TncGlobalLeaderboard />} />
            <Route path="/tnc-study" element={<TncStudyPlan />} />
            <Route path="/tnc-tests/:examId/retry/:attemptId" element={<TncRetry />} />
            <Route path="/tnc-tests/:examId" element={<TncQuiz />} />
            <Route path="/tnc-tests/:examId/result/:attemptId" element={<TncSharedResult />} />
            <Route path="/tnc-tests/:examId/leaderboard" element={<TncLeaderboard />} />
            
            
            <Route path="/src/routes/index.tsx" element={<RoutesIndex />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <StudyFeaturesWelcome />
        </MaintenanceModeGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
  );
};

export default App;
