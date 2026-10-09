import confetti from "canvas-confetti";

const SOUND_KEY = "ts-quiz-sound";
const PAPER_KEY = "ts-quiz-paper";

export const getSoundOn = () => localStorage.getItem(SOUND_KEY) !== "off";
export const setSoundOn = (on: boolean) => localStorage.setItem(SOUND_KEY, on ? "on" : "off");
export const getPaperMode = () => localStorage.getItem(PAPER_KEY) === "on";
export const setPaperMode = (on: boolean) => localStorage.setItem(PAPER_KEY, on ? "on" : "off");

let ctx: AudioContext | null = null;
function tone(freq: number, dur: number, delay = 0, vol = 0.05) {
  if (!getSoundOn()) return;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* audio not available */
  }
}

export const playTap = () => tone(660, 0.08, 0, 0.03);
export const playMove = () => tone(520, 0.06, 0, 0.02);
export const playSubmit = () => {
  tone(523, 0.18);
  tone(659, 0.18, 0.1);
  tone(784, 0.3, 0.2);
};

export function celebrate() {
  const end = Date.now() + 1200;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ["#6366f1", "#10b981", "#facc15"] });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ["#6366f1", "#10b981", "#facc15"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
