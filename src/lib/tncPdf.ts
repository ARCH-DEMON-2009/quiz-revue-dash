import { jsPDF } from "jspdf";
import { stripHtml } from "./sanitizeHtml";
import { fetchTncImageDataUrl, type TncQuestion } from "./tncApi";

interface PdfArgs {
  examName: string;
  score: number;
  maxMarks: number;
  correct: number;
  wrong: number;
  skipped: number;
  questions: TncQuestion[];
  answers: Record<string, string>;
  userName?: string;
  /** Brand/site shown in the watermark + footer so the PDF can't be rebranded. */
  site?: string;
  brand?: string;
}

const OPTS = ["A", "B", "C", "D"] as const;
const DEFAULT_SITE = "https://test-sagar-jet.vercel.app/";
const DEFAULT_BRAND = "Test Sagar";
const LOGO_PATH = "/logo.png";

// ---- Palette (RGB) ----
const INK: [number, number, number] = [24, 27, 43];
const MUTED: [number, number, number] = [110, 116, 139];
const BRAND: [number, number, number] = [79, 70, 229]; // indigo
const BRAND_DARK: [number, number, number] = [55, 48, 163];
const ACCENT: [number, number, number] = [16, 185, 129]; // emerald
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [217, 119, 6];
const CARD_BG: [number, number, number] = [248, 249, 252];
const LINE: [number, number, number] = [228, 230, 238];
const GREEN_BG: [number, number, number] = [236, 253, 245];
const RED_BG: [number, number, number] = [254, 242, 242];

/** Load any URL into a base64 data URL (used for the site logo). */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Get the natural pixel dimensions of a data URL. */
function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });
}

function fmtType(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
}

function setOpacity(doc: jsPDF, opacity: number) {
  const GState = (doc as any).GState;
  if (GState && (doc as any).setGState) (doc as any).setGState(new GState({ opacity }));
}

/** Simulate a vertical gradient by stacking thin rectangles. */
function gradientRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  from: [number, number, number],
  to: [number, number, number],
) {
  const steps = 40;
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * sh, w, sh + 0.6, "F");
  }
}

/** Stamp a repeating diagonal watermark (logo + brand) + footer onto every page. */
function stampOverlay(doc: jsPDF, brand: string, site: string, logo: string | null, logoRatio: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  const cleanSite = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const text = `${brand}  •  ${cleanSite}`;

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);

    // Tiled diagonal logo watermark (very faint)
    if (logo) {
      setOpacity(doc, 0.04);
      const lw = 96;
      const lh = logoRatio ? lw * logoRatio : 96;
      for (let y = 70; y < pageH; y += 210) {
        for (let x = 20; x < pageW; x += 230) {
          try {
            doc.addImage(logo, fmtType(logo), x, y, lw, lh, undefined, "FAST");
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Tiled diagonal text watermark
    setOpacity(doc, 0.06);
    doc.setTextColor(120, 120, 140);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    for (let y = 40; y < pageH + 60; y += 120) {
      for (let x = -30; x < pageW; x += 240) {
        doc.text(text, x, y, { angle: 32 });
      }
    }

    setOpacity(doc, 1);

    // Footer band
    doc.setFillColor(...CARD_BG);
    doc.rect(0, pageH - 30, pageW, 30, "F");
    doc.setDrawColor(...LINE);
    doc.line(0, pageH - 30, pageW, pageH - 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND);
    doc.textWithLink(`${brand} — ${cleanSite}`, 40, pageH - 12, { url: site });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("Official & verified result — do not redistribute", pageW / 2, pageH - 12, { align: "center" });
    doc.text(`Page ${p} of ${pageCount}`, pageW - 40, pageH - 12, { align: "right" });
  }
}

export async function downloadTncResultPdf(args: PdfArgs) {
  const { examName, score, maxMarks, correct, wrong, skipped, questions, answers, userName } = args;
  const site = args.site ?? DEFAULT_SITE;
  const brand = args.brand ?? DEFAULT_BRAND;
  const cleanSite = site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  const bottomLimit = pageH - margin - 20;

  // Preload logo + all question images (CORS-safe via the edge proxy).
  const logo = await urlToDataUrl(LOGO_PATH);
  let logoRatio = 1;
  if (logo) {
    const s = await imageSize(logo);
    if (s.w) logoRatio = s.h / s.w;
  }

  const imageMap = new Map<string, { data: string; ratio: number }>();
  await Promise.all(
    questions
      .filter((q) => q.imageUrl)
      .map(async (q) => {
        const data = await fetchTncImageDataUrl(q.imageUrl as string);
        if (data) {
          const s = await imageSize(data);
          imageMap.set(q.rowId, { data, ratio: s.w ? s.h / s.w : 0.6 });
        }
      }),
  );

  let y = margin;

  const ensure = (h: number) => {
    if (y + h > bottomLimit) {
      doc.addPage();
      y = margin + 6;
    }
  };

  const writeLines = (
    text: string,
    size: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = INK,
    indent = 0,
    lineGap = 5,
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW - indent);
    for (const line of lines) {
      ensure(size + lineGap);
      doc.text(line, margin + indent, y);
      y += size + lineGap;
    }
  };

  // ============ COVER HEADER ============
  const headerH = 150;
  gradientRect(doc, 0, 0, pageW, headerH, BRAND, BRAND_DARK);
  // subtle accent stripe
  doc.setFillColor(...ACCENT);
  doc.rect(0, headerH, pageW, 4, "F");

  // Logo chip
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 26, 46, 46, 8, 8, "F");
    try {
      const lw = 34;
      const lh = logoRatio ? lw * logoRatio : 34;
      doc.addImage(logo, fmtType(logo), margin + 6, 26 + (46 - lh) / 2, lw, lh, undefined, "FAST");
    } catch {
      /* ignore */
    }
  }

  const brandX = margin + (logo ? 60 : 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(brand, brandX, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setOpacity(doc, 0.85);
  doc.text("Nursing Test Series", brandX, 62);
  setOpacity(doc, 1);

  // Report label pill (top-right)
  doc.setFillColor(255, 255, 255);
  setOpacity(doc, 0.16);
  doc.roundedRect(pageW - margin - 140, 30, 140, 22, 11, 11, "F");
  setOpacity(doc, 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("RESULT REPORT", pageW - margin - 70, 44.5, { align: "center" });

  // Exam title inside header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(stripHtml(examName) || "TNC Test Result", maxW);
  doc.text(titleLines.slice(0, 2), margin, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setOpacity(doc, 0.9);
  const meta = `${userName ? `Candidate: ${userName}   |   ` : ""}${new Date().toLocaleString()}`;
  doc.text(meta, margin, 132);
  setOpacity(doc, 1);

  y = headerH + 24;

  // ============ SCORE HERO CARD ============
  const heroH = 118;
  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...LINE);
  doc.roundedRect(margin, y, maxW, heroH, 12, 12, "FD");

  const pct = maxMarks ? (score / maxMarks) * 100 : 0;

  // Donut-style percentage gauge (left)
  const cx = margin + 66;
  const cy = y + heroH / 2;
  const rOuter = 40;
  // track
  doc.setFillColor(...LINE);
  doc.circle(cx, cy, rOuter, "F");
  // progress arc emulation: fill brand circle then white inner
  doc.setFillColor(...BRAND);
  doc.circle(cx, cy, rOuter, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, rOuter - 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND);
  doc.text(`${pct.toFixed(0)}%`, cx, cy + 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("SCORE", cx, cy + 14, { align: "center" });

  // Score number (middle)
  const sx0 = margin + 128;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("TOTAL SCORE", sx0, y + 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...INK);
  doc.text(`${score.toFixed(2)}`, sx0, y + 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`/ ${maxMarks} marks`, sx0 + doc.getTextWidth(score.toFixed(2)) + 8, y + 62);

  const remark =
    pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Average" : "Keep Practicing";
  const remarkColor: [number, number, number] = pct >= 60 ? GREEN : pct >= 40 ? AMBER : RED;
  doc.setFillColor(...remarkColor);
  setOpacity(doc, 0.12);
  doc.roundedRect(sx0, y + 74, 86, 20, 10, 10, "F");
  setOpacity(doc, 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...remarkColor);
  doc.text(remark, sx0 + 43, y + 87.5, { align: "center" });

  // Mini stat pills (right)
  const stats: Array<[string, number, [number, number, number]]> = [
    ["Correct", correct, GREEN],
    ["Wrong", wrong, RED],
    ["Skipped", skipped, AMBER],
  ];
  const pillW = 78;
  const gap = 8;
  let px = pageW - margin - pillW * stats.length - gap * (stats.length - 1);
  for (const [label, val, color] of stats) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...LINE);
    doc.roundedRect(px, y + 22, pillW, heroH - 44, 8, 8, "FD");
    doc.setFillColor(...color);
    doc.roundedRect(px, y + 22, 4, heroH - 44, 2, 2, "F");
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(String(val), px + pillW / 2, y + 58, { align: "center" });
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, px + pillW / 2, y + 76, { align: "center" });
    px += pillW + gap;
  }

  y += heroH + 26;

  // ============ SECTION HEADER ============
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, y - 12, 4, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("Detailed Answer Review", margin + 12, y + 2);
  y += 18;
  doc.setDrawColor(...LINE);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  // ============ QUESTION CARDS ============
  questions.forEach((q, i) => {
    const userAns = answers[q.rowId];
    const isSkipped = !userAns;
    const isCorrect = userAns === q.correctAnswer;
    const accent: [number, number, number] = isSkipped ? AMBER : isCorrect ? GREEN : RED;
    const statusText = isSkipped ? "SKIPPED" : isCorrect ? "CORRECT" : "WRONG";

    ensure(70);
    const cardTop = y;
    // left accent bar drawn after we know card height — instead draw per block.
    doc.setFillColor(...accent);
    doc.roundedRect(margin, y, 3.5, 16, 1.5, 1.5, "F");

    // Question number + status badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`Q${i + 1}`, margin + 12, y + 12);

    const badgeW = doc.getTextWidth(statusText) + 18;
    doc.setFillColor(...accent);
    setOpacity(doc, 0.14);
    doc.roundedRect(margin + 40, y, badgeW, 16, 8, 8, "F");
    setOpacity(doc, 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text(statusText, margin + 40 + badgeW / 2, y + 11, { align: "center" });
    y += 26;

    // Question text
    writeLines(stripHtml(q.questionText), 10.5, "bold", INK, 12, 4);
    y += 2;

    // Embedded question image
    const img = imageMap.get(q.rowId);
    if (img) {
      const iw = Math.min(200, maxW - 12);
      const ih = iw * (img.ratio || 0.6);
      ensure(ih + 10);
      try {
        doc.addImage(img.data, fmtType(img.data), margin + 12, y, iw, ih, undefined, "FAST");
        y += ih + 8;
      } catch {
        /* ignore broken image */
      }
    }

    // Options as pill rows
    OPTS.forEach((opt) => {
      const text = stripHtml(q[`option${opt}` as keyof TncQuestion] as string);
      if (!text) return;
      const optCorrect = q.correctAnswer === opt;
      const optUser = userAns === opt;

      doc.setFont("helvetica", optCorrect || optUser ? "bold" : "normal");
      doc.setFontSize(9.5);
      const label = `${text}`;
      const textLines = doc.splitTextToSize(label, maxW - 66);
      const rowH = Math.max(20, textLines.length * 12 + 8);
      ensure(rowH + 4);

      // row background
      if (optCorrect) {
        doc.setFillColor(...GREEN_BG);
        doc.setDrawColor(...GREEN);
      } else if (optUser) {
        doc.setFillColor(...RED_BG);
        doc.setDrawColor(...RED);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...LINE);
      }
      doc.roundedRect(margin + 12, y, maxW - 12, rowH, 6, 6, optCorrect || optUser ? "FD" : "FD");

      // option letter circle
      const letterColor: [number, number, number] = optCorrect ? GREEN : optUser ? RED : MUTED;
      doc.setFillColor(...letterColor);
      doc.circle(margin + 28, y + rowH / 2, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(opt, margin + 28, y + rowH / 2 + 3, { align: "center" });

      // option text
      doc.setFont("helvetica", optCorrect || optUser ? "bold" : "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...(optCorrect ? GREEN : optUser ? RED : INK));
      let ty = y + rowH / 2 - (textLines.length - 1) * 6 + 3;
      for (const ln of textLines) {
        doc.text(ln, margin + 44, ty);
        ty += 12;
      }

      // trailing tag
      if (optCorrect) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GREEN);
        doc.text("CORRECT", pageW - margin - 8, y + rowH / 2 + 2.5, { align: "right" });
      } else if (optUser) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...RED);
        doc.text("YOUR ANSWER", pageW - margin - 8, y + rowH / 2 + 2.5, { align: "right" });
      }

      y += rowH + 5;
    });

    if (isSkipped) {
      writeLines("You did not answer this question.", 9, "normal", AMBER, 12, 4);
    }

    // Explanation
    const expl = stripHtml(q.explanation);
    if (expl) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const explLines = doc.splitTextToSize(expl, maxW - 36);
      const boxH = explLines.length * 11 + 26;
      ensure(boxH + 4);
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(...BRAND);
      setOpacity(doc, 1);
      doc.roundedRect(margin + 12, y, maxW - 12, boxH, 6, 6, "F");
      doc.setFillColor(...BRAND);
      doc.roundedRect(margin + 12, y, 3, boxH, 1.5, 1.5, "F");
      doc.setTextColor(...BRAND);
      doc.setFontSize(8.5);
      doc.text("EXPLANATION", margin + 24, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      let ey = y + 26;
      for (const ln of explLines) {
        doc.text(ln, margin + 24, ey);
        ey += 11;
      }
      y += boxH + 6;
    }

    // divider between questions
    y += 6;
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([2, 2], 0);
    ensure(6);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineDashPattern([], 0);
    y += 14;
    void cardTop;
  });

  // Overlay watermark + footer last so it covers every generated page.
  stampOverlay(doc, brand, site, logo, logoRatio);

  const safe = (stripHtml(examName) || "tnc-result").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  doc.save(`${safe}-result.pdf`);
}
