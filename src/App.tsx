import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Quiz from "./pages/Quiz";
import QuizRedirect from "./pages/QuizRedirect";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Analytics from "./pages/Analytics";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import ContactUs from "./pages/ContactUs";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import Verify from "./pages/Verify";
import TncTests from "./pages/TncTests";
import TncQuiz from "./pages/TncQuiz";
import { BlockedUserGuard } from "./components/BlockedUserGuard";
import { BypassBlockGuard } from "./components/BypassBlockGuard";
import { MaintenanceModeGuard } from "./components/MaintenanceModeGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MaintenanceModeGuard>
          <BypassBlockGuard />
          <BlockedUserGuard />
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
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/tnc-tests" element={<TncTests />} />
            <Route path="/tnc-tests/:examId" element={<TncQuiz />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MaintenanceModeGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
