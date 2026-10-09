/** Render a 1080x1920 shareable result story card as a PNG blob. */
export interface StoryCardData {
  name: string;
  avatarUrl: string | null;
  examName: string;
  score: number;
  maxMarks: number;
  correct: number;
  wrong: number;
  skipped: number;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines = 3) {
  const words = text.split(/\s+/);
  let line = "";
  let n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > max && line) {
      c.fillText(line, x, y + n * lh);
      line = w;
      if (++n >= lines - 1) break;
    } else line = test;
  }
  c.fillText(line, x, y + n * lh);
}

export function badgeFor(pct: number) {
  if (pct >= 90) return "Top 5% Performer";
  if (pct >= 80) return "Top 10% Performer";
  if (pct >= 60) return "Rising Star";
  return "Keep Climbing";
}

export async function renderStoryCard(d: StoryCardData): Promise<Blob> {
  const W = 1080, H = 1920;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  const pct = d.maxMarks ? Math.max(0, (d.score / d.maxMarks) * 100) : 0;
  const attempted = d.correct + d.wrong;
  const acc = attempted ? (d.correct / attempted) * 100 : 0;

  // Background
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(0.55, "#1e1b4b");
  bg.addColorStop(1, "#064e3b");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (const [x, y, r, col] of [[200, 300, 500, "rgba(99,102,241,0.35)"], [900, 1500, 600, "rgba(16,185,129,0.3)"]] as const) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "transparent");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  c.textAlign = "center";
  c.fillStyle = "#a5b4fc";
  c.font = "600 44px Poppins, sans-serif";
  c.fillText("TEST SAGAR", W / 2, 150);

  // Avatar
  const cx = W / 2, cy = 420, ar = 170;
  const ring = c.createLinearGradient(cx - ar, cy - ar, cx + ar, cy + ar);
  ring.addColorStop(0, "#818cf8");
  ring.addColorStop(1, "#34d399");
  c.beginPath();
  c.arc(cx, cy, ar + 14, 0, Math.PI * 2);
  c.fillStyle = ring;
  c.fill();
  const img = d.avatarUrl ? await loadImg(d.avatarUrl) : null;
  c.save();
  c.beginPath();
  c.arc(cx, cy, ar, 0, Math.PI * 2);
  c.clip();
  if (img) c.drawImage(img, cx - ar, cy - ar, ar * 2, ar * 2);
  else {
    c.fillStyle = "#312e81";
    c.fillRect(cx - ar, cy - ar, ar * 2, ar * 2);
    c.fillStyle = "#fff";
    c.font = "700 150px Poppins, sans-serif";
    c.textBaseline = "middle";
    c.fillText((d.name[0] || "S").toUpperCase(), cx, cy + 6);
    c.textBaseline = "alphabetic";
  }
  c.restore();

  c.fillStyle = "#ffffff";
  c.font = "700 72px Poppins, sans-serif";
  c.fillText(d.name.slice(0, 22), W / 2, 700);

  // Badge pill
  const badge = `🏆 ${badgeFor(pct)}`;
  c.font = "600 46px Poppins, sans-serif";
  const bw = c.measureText(badge).width + 90;
  c.fillStyle = "rgba(250,204,21,0.15)";
  c.strokeStyle = "#facc15";
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect(W / 2 - bw / 2, 760, bw, 100, 50);
  c.fill();
  c.stroke();
  c.fillStyle = "#fde68a";
  c.fillText(badge, W / 2, 828);

  // Score ring
  const sy = 1180, sr = 200;
  c.lineWidth = 34;
  c.strokeStyle = "rgba(255,255,255,0.12)";
  c.beginPath();
  c.arc(W / 2, sy, sr, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = ring;
  c.lineCap = "round";
  c.beginPath();
  c.arc(W / 2, sy, sr, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(pct, 100)) / 100);
  c.stroke();
  c.fillStyle = "#fff";
  c.font = "800 120px Poppins, sans-serif";
  c.fillText(`${pct.toFixed(0)}%`, W / 2, sy + 30);
  c.font = "500 40px Poppins, sans-serif";
  c.fillStyle = "#cbd5e1";
  c.fillText(`${d.score.toFixed(1)} / ${d.maxMarks} marks`, W / 2, sy + 95);

  // Stats
  const stats: [string, string, string][] = [
    ["Correct", String(d.correct), "#34d399"],
    ["Wrong", String(d.wrong), "#f87171"],
    ["Accuracy", `${acc.toFixed(0)}%`, "#a5b4fc"],
  ];
  stats.forEach(([l, v, col], i) => {
    const x = 200 + i * 340;
    c.fillStyle = col;
    c.font = "700 76px Poppins, sans-serif";
    c.fillText(v, x, 1520);
    c.fillStyle = "#94a3b8";
    c.font = "500 36px Poppins, sans-serif";
    c.fillText(l, x, 1575);
  });

  c.fillStyle = "#e2e8f0";
  c.font = "600 42px Poppins, sans-serif";
  wrap(c, d.examName, W / 2, 1000 - 40, 900, 52, 2);

  c.fillStyle = "#34d399";
  c.font = "600 44px Poppins, sans-serif";
  c.fillText("Can you beat my score?", W / 2, 1720);
  c.fillStyle = "#a5b4fc";
  c.font = "500 38px Poppins, sans-serif";
  c.fillText("tncnursing.site", W / 2, 1790);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/png"));
}
