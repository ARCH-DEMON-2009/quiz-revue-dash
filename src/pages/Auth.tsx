import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { isValidEmailProvider } from "@/lib/emailValidator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const whatsapp = session.user.user_metadata?.whatsapp_number;
        if (whatsapp) {
          setTimeout(() => navigate(redirectTo, { replace: true }), 0);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && session.user.user_metadata?.whatsapp_number) {
        navigate(redirectTo, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Logged in successfully!");
      } else {
        if (!name.trim()) throw new Error("Please enter your name");
        if (!whatsappNumber.trim()) throw new Error("Please enter your WhatsApp number");
        
        const emailValidation = isValidEmailProvider(email);
        if (!emailValidation.valid) throw new Error(emailValidation.message);

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
              whatsapp_number: whatsappNumber.trim()
            }
          }
        });
        if (error) throw error;
        toast.success("Check your email to confirm registration!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user && user.user_metadata?.whatsapp_number) return null;

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-br from-indigo-50 to-emerald-50">
      <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-2">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-indigo-100">

        <CardHeader className="space-y-4 text-center">
          <div 
            className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate("/")}
          >
            <img 
              src="/logo.png" 
              alt="Test Sagar" 
              className="h-16 w-16 rounded-2xl shadow-lg object-contain bg-white" 
            />
            <CardTitle className="text-3xl font-extrabold mt-3 bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              Test Sagar
            </CardTitle>
          </div>
          <CardDescription className="text-gray-500 font-medium">
            {isLogin ? "Welcome back! Please sign in to your account." : "Create your account to start your journey."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="1234567890"
                      className="pl-10"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {isLogin && (
              <div className="text-right">
                <Button 
                  variant="link" 
                  className="px-0 font-normal text-indigo-600 hover:text-indigo-500"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info("Please contact support to reset your password.");
                  }}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold py-6 rounded-xl shadow-lg transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  className="text-indigo-600 font-bold hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-6 text-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? "Sign in to continue your preparation" : "Start preparing with Test Sagar"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            Test Sagar is a mock test platform for students preparing for medical, engineering and nursing entrance
            exams. An account keeps every attempt, score and mistake in one place, so your practice builds on itself
            instead of starting from zero each week.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What your account keeps for you</h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Your full attempt history.</span> Every test you finish is
              saved with your answers, the correct answers and the time you spent, so you can revisit a paper months
              later and see exactly where marks slipped away.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Subject-wise accuracy.</span> Your results are broken down
              by subject and topic, which shows whether a low score came from weak concepts or from rushing the last
              ten questions.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Weekly rankings.</span> Scores feed a weekly leaderboard so
              you can compare your performance against other students attempting the same papers.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Downloadable question papers.</span> Finished tests can be
              saved as PDFs for revision away from the screen.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Why we ask for a WhatsApp number</h2>
          <p className="text-sm leading-relaxed">
            New test series, result corrections and account or payment issues are handled over WhatsApp, because that
            reaches students faster than email. We use the number only for these updates and for verifying your account
            if you ever lose access to your email. We never sell contact details, and you can ask us to remove your
            number at any time.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Choosing your email address</h2>
          <p className="text-sm leading-relaxed">
            Please sign up with a real, permanent inbox such as Gmail or your college address. Temporary and disposable
            mail services are blocked, since confirmation links, premium receipts and password resets all travel by
            email and cannot be recovered once a throwaway address expires.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Trouble signing in?</h2>
          <p className="text-sm leading-relaxed">
            If the confirmation email has not arrived, check your spam folder before requesting another one. For a
            forgotten password, a blocked account or premium that has not activated, message our support assistant on
            Telegram at{" "}
            <a
              href="https://t.me/TestSagarHelpRobot"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 hover:underline"
            >
              @TestSagarHelpRobot
            </a>{" "}
            and include the email address on your account.
          </p>
        </div>
      </section>
      </div>
    </div>

  );
};

export default Auth;