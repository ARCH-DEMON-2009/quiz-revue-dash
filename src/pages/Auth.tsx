import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { isValidEmailProvider } from "@/lib/emailValidator";
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
              whatsapp_number: whatsappNumber.trim(),
            },
          },
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
    <div className="auth-stage">
      <div className={`auth-shell ${isLogin ? "" : "active"}`}>
        <div className="auth-curve" />
        <div className="auth-curve2" />

        {/* ---------- Login form ---------- */}
        <div className="auth-form-box login">
          <h2 className="auth-anim" style={{ ["--D" as any]: 0, ["--S" as any]: 21 }}>Login</h2>
          <form onSubmit={handleAuth}>
            <div className="auth-input auth-anim" style={{ ["--D" as any]: 1, ["--S" as any]: 22 }}>
              <input
                type="email"
                required={isLogin}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label>Email</label>
              <Mail className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--D" as any]: 2, ["--S" as any]: 23 }}>
              <input
                type="password"
                required={isLogin}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label>Password</label>
              <Lock className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--D" as any]: 3, ["--S" as any]: 24 }}>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Processing..." : "Login"}
              </button>
            </div>

            <div className="auth-link auth-anim" style={{ ["--D" as any]: 4, ["--S" as any]: 25 }}>
              <p>
                Don't have an account? <br />
                <button type="button" onClick={() => setIsLogin(false)}>Sign Up</button>
              </p>
            </div>
          </form>
        </div>

        <div className="auth-info login">
          <h2 className="auth-anim" style={{ ["--D" as any]: 0, ["--S" as any]: 20 }}>WELCOME BACK!</h2>
          <p className="auth-anim" style={{ ["--D" as any]: 1, ["--S" as any]: 21 }}>
            Your attempts, accuracy and rankings are waiting. Sign in to continue where you left off.
          </p>
        </div>

        {/* ---------- Register form ---------- */}
        <div className="auth-form-box register">
          <h2 className="auth-anim" style={{ ["--li" as any]: 17, ["--S" as any]: 0 }}>Register</h2>
          <form onSubmit={handleAuth}>
            <div className="auth-input auth-anim" style={{ ["--li" as any]: 18, ["--S" as any]: 1 }}>
              <input
                type="text"
                required={!isLogin}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label>Full Name</label>
              <UserIcon className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--li" as any]: 19, ["--S" as any]: 2 }}>
              <input
                type="email"
                required={!isLogin}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label>Email</label>
              <Mail className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--li" as any]: 20, ["--S" as any]: 3 }}>
              <input
                type="tel"
                required={!isLogin}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <label>WhatsApp Number</label>
              <Phone className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--li" as any]: 21, ["--S" as any]: 4 }}>
              <input
                type="password"
                required={!isLogin}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label>Password</label>
              <Lock className="auth-icon" />
            </div>

            <div className="auth-input auth-anim" style={{ ["--li" as any]: 22, ["--S" as any]: 5 }}>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Processing..." : "Register"}
              </button>
            </div>

            <div className="auth-link auth-anim" style={{ ["--li" as any]: 23, ["--S" as any]: 6 }}>
              <p>
                Already have an account? <br />
                <button type="button" onClick={() => setIsLogin(true)}>Sign In</button>
              </p>
            </div>
          </form>
        </div>

        <div className="auth-info register">
          <h2 className="auth-anim" style={{ ["--li" as any]: 17, ["--S" as any]: 0 }}>WELCOME!</h2>
          <p className="auth-anim" style={{ ["--li" as any]: 18, ["--S" as any]: 1 }}>
            Create your Test Sagar account to save every attempt, track subject-wise accuracy and join the
            weekly rankings.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Auth;
