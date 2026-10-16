import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type SnowIntensity = "light" | "medium" | "heavy";

interface WinterPreferences {
  snowfall: boolean;
  intensity: SnowIntensity;
  extraAnimations: boolean;
}

interface SnowflakeParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
}

const STORAGE_KEY = "test-sagar-winter-effects";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PARTICLE_COUNTS: Record<SnowIntensity, number> = {
  light: 30,
  medium: 58,
  heavy: 88,
};

const getReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

const readPreferences = (): WinterPreferences => {
  const defaults: WinterPreferences = {
    snowfall: !getReducedMotion(),
    intensity: "medium",
    extraAnimations: true,
  };

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;

    const value = JSON.parse(saved) as Partial<WinterPreferences>;
    return {
      snowfall: typeof value.snowfall === "boolean" ? value.snowfall : defaults.snowfall,
      intensity: value.intensity === "light" || value.intensity === "heavy" ? value.intensity : "medium",
      extraAnimations: typeof value.extraAnimations === "boolean" ? value.extraAnimations : true,
    };
  } catch {
    return defaults;
  }
};

const makeParticle = (width: number, height: number, initial = false): SnowflakeParticle => ({
  x: Math.random() * width,
  y: initial ? Math.random() * height : -8,
  radius: 1.25 + Math.random() * 1.75,
  speed: 0.32 + Math.random() * 0.7,
  drift: (Math.random() - 0.5) * 0.55,
  phase: Math.random() * Math.PI * 2,
  opacity: 0.3 + Math.random() * 0.52,
});

const WinterEffects = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preferences, setPreferences] = useState(readPreferences);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotion);
  const { pathname } = useLocation();
  const activeExam = /^\/quiz\/[^/]+\/?$/.test(pathname) || /^\/tnc-tests\/(?!leaderboard\/?$)[^/]+\/?$/.test(pathname);

  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) return;
    const updatePreference = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    setPrefersReducedMotion(query.matches);
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.winterMotion = preferences.extraAnimations ? "on" : "off";
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Visual preferences remain available for this session when storage is blocked.
    }
  }, [preferences]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preferences.snowfall || prefersReducedMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let particles: SnowflakeParticle[] = [];
    let animationFrame = 0;
    let lastFrame = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, width <= 640 ? 1 : 1.25);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const mobileScale = width <= 640 ? 0.58 : 1;
      const count = Math.round(PARTICLE_COUNTS[preferences.intensity] * mobileScale);
      particles = Array.from({ length: count }, () => makeParticle(width, height, true));
    };

    const draw = (now: number) => {
      if (document.hidden) return;
      if (now - lastFrame < 32) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      const elapsed = Math.min((now - lastFrame) / 16.67, 2.5);
      lastFrame = now;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.phase += 0.008 * elapsed;
        particle.x += (particle.drift + Math.sin(particle.phase) * 0.14) * elapsed;
        particle.y += particle.speed * elapsed;

        if (particle.y > height + 8) {
          particle.y = -8;
          particle.x = Math.random() * width;
        }
        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;

        context.beginPath();
        context.fillStyle = `rgba(245, 250, 255, ${particle.opacity})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!animationFrame) {
        lastFrame = performance.now();
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [preferences.intensity, preferences.snowfall, prefersReducedMotion]);

  return (
    <>
      <canvas ref={canvasRef} className="winter-snow-canvas" aria-hidden="true" />
      {!activeExam && (
        <div className="winter-effects-control">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="winter-effects-trigger h-10 w-10 rounded-full"
                aria-label="Winter effects settings"
                title="Winter effects settings"
              >
                <Snowflake className="h-4 w-4 text-primary" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" sideOffset={12} className="w-[calc(100vw-2rem)] space-y-4 sm:w-80">
              <div>
                <h2 className="text-sm font-semibold">Winter effects</h2>
                <p className="mt-1 text-xs text-muted-foreground">Your choices are saved on this device.</p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="winter-snowfall" className="text-sm">Snowfall</Label>
                  <p className="text-xs text-muted-foreground">Decorative flakes across the page</p>
                </div>
                <Switch
                  id="winter-snowfall"
                  checked={preferences.snowfall}
                  disabled={prefersReducedMotion}
                  onCheckedChange={(snowfall) => setPreferences((current) => ({ ...current, snowfall }))}
                />
              </div>

              {prefersReducedMotion && (
                <p className="text-xs text-muted-foreground">Snowfall is paused by your reduced-motion setting.</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="winter-intensity" className="text-sm">Snowfall intensity</Label>
                <Select
                  value={preferences.intensity}
                  onValueChange={(intensity: SnowIntensity) => setPreferences((current) => ({ ...current, intensity }))}
                  disabled={!preferences.snowfall || prefersReducedMotion}
                >
                  <SelectTrigger id="winter-intensity" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="winter-animations" className="text-sm">Ambient motion</Label>
                  <p className="text-xs text-muted-foreground">Slow background light drift</p>
                </div>
                <Switch
                  id="winter-animations"
                  checked={preferences.extraAnimations}
                  onCheckedChange={(extraAnimations) => setPreferences((current) => ({ ...current, extraAnimations }))}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
};

export default WinterEffects;