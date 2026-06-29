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

const BRAND_RGB: [number, number, number] = [37, 99, 235];

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

/** Stamp a repeating diagonal watermark (logo + brand) + footer onto every page. */
function stampOverlay(doc: jsPDF, brand: string, site: string, logo: string | null, logoRatio: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  const cleanSite = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const text = `${brand} • ${cleanSite}`;

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);

    // Tiled diagonal logo watermark (very faint)
    if (logo) {
      setOpacity(doc, 0.05);
      const lw = 90;
      const lh = logoRatio ? lw * logoRatio : 90;
      for (let y = 60; y < pageH; y += 200) {
        for (let x = 10; x < pageW; x += 220) {
          try {
            doc.addImage(logo, fmtType(logo), x, y, lw, lh, undefined, "FAST");
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Tiled diagonal text watermark
    setOpacity(doc, 0.07);
    doc.setTextColor(110, 110, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    for (let y = 40; y < pageH + 60; y += 130) {
      for (let x = -30; x < pageW; x += 250) {
        doc.text(text, x, y, { angle: 35 });
      }
    }

    setOpacity(doc, 1);

    // Footer rule + clickable link
    doc.setDrawColor(225);
    doc.line(40, pageH - 34, pageW - 40, pageH - 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_RGB);
    doc.textWithLink(`${brand} — ${cleanSite}`, 40, pageH - 20, { url: site });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${p} of ${pageCount}`, pageW - 40, pageH - 20, { align: "right" });
  }
}

export async function downloadTncResultPdf(args: PdfArgs) {
  const { examName, score, maxMarks, correct, wrong, skipped, questions, answers, userName } = args;
  const site = args.site ?? DEFAULT_SITE;
  const brand = args.brand ?? DEFAULT_BRAND;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;

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
    if (y + h > pageH - margin - 20) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (
    text: string,
    size: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = [20, 20, 20],
    indent = 0,
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW - indent);
    for (const line of lines) {
      ensure(size + 6);
      doc.text(line, margin + indent, y);
      y += size + 6;
    }
  };

  // ----- Header band -----
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 70, "F");
  if (logo) {
    try {
      doc.addImage(logo, fmtType(logo), margin, 16, 38, logoRatio ? 38 * logoRatio : 38, undefined, "FAST");
    } catch {
      /* ignore */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(brand, margin + (logo ? 48 : 0), 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Nursing Test Series — Result Report", margin + (logo ? 48 : 0), 52);
  y = 92;

  // ----- Title + meta -----
  writeLines(stripHtml(examName) || "TNC Test Result", 16, "bold");
  y += 2;
  if (userName) writeLines(`Candidate: ${userName}`, 11, "normal", [90, 90, 90]);
  writeLines(`Date: ${new Date().toLocaleString()}`, 10, "normal", [120, 120, 120]);
  y += 8;

  // ----- Score summary card -----
  ensure(86);
  doc.setDrawColor(225);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, maxW, 72, 8, 8, "FD");
  const pct = maxMarks ? (score / maxMarks) * 100 : 0;
  doc.setTextColor(...BRAND_RGB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`${score.toFixed(2)} / ${maxMarks}`, margin + 16, y + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(`Percentage: ${pct.toFixed(1)}%`, margin + 16, y + 54);

  // mini stat columns on the right
  const stats: Array<[string, number, [number, number, number]]> = [
    ["Correct", correct, [22, 130, 60]],
    ["Wrong", wrong, [190, 40, 40]],
    ["Skipped", skipped, [180, 130, 0]],
  ];
  const colW = 90;
  let sx = pageW - margin - colW * stats.length;
  for (const [label, val, color] of stats) {
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(val), sx + colW / 2, y + 34, { align: "center" });
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, sx + colW / 2, y + 52, { align: "center" });
    sx += colW;
  }
  y += 92;

  // ----- Question review -----
  writeLines("Question Review", 14, "bold", BRAND_RGB);
  y += 4;

  questions.forEach((q, i) => {
    y += 8;
    ensure(24);
    writeLines(`Q${i + 1}. ${stripHtml(q.questionText)}`, 11, "bold");

    // Embedded question image
    const img = imageMap.get(q.rowId);
    if (img) {
      const iw = Math.min(220, maxW);
      const ih = iw * (img.ratio || 0.6);
      ensure(ih + 8);
      try {
        doc.addImage(img.data, fmtType(img.data), margin, y, iw, ih, undefined, "FAST");
        y += ih + 8;
      } catch {
        /* ignore broken image */
      }
    }

    const userAns = answers[q.rowId];
    OPTS.forEach((opt) => {
      const text = stripHtml(q[`option${opt}` as keyof TncQuestion] as string);
      if (!text) return;
      const isCorrect = q.correctAnswer === opt;
      const isUser = userAns === opt;
      let label = `${opt}. ${text}`;
      if (isCorrect) label += "   ✓ Correct";
      if (isUser && !isCorrect) label += "   ✗ Your answer";
      const color: [number, number, number] = isCorrect
        ? [22, 130, 60]
        : isUser
        ? [190, 40, 40]
        : [60, 60, 60];
      writeLines(label, 10, isCorrect || isUser ? "bold" : "normal", color, 14);
    });
    if (!userAns) writeLines("Not answered", 10, "normal", [180, 130, 0], 14);

    const expl = stripHtml(q.explanation);
    if (expl) writeLines(`Explanation: ${expl}`, 9, "normal", [100, 100, 100], 14);
  });

  // Overlay watermark + footer last so it covers every generated page.
  stampOverlay(doc, brand, site, logo, logoRatio);

  const safe = (stripHtml(examName) || "tnc-result").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  doc.save(`${safe}-result.pdf`);
}
