import { jsPDF } from "jspdf";
import { stripHtml } from "./sanitizeHtml";
import type { TncQuestion } from "./tncApi";

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
}

const OPTS = ["A", "B", "C", "D"] as const;

export function downloadTncResultPdf(args: PdfArgs) {
  const { examName, score, maxMarks, correct, wrong, skipped, questions, answers, userName } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensure(size + 6);
      doc.text(line, margin, y);
      y += size + 6;
    }
  };

  // Header
  writeLines(stripHtml(examName) || "TNC Test Result", 18, "bold");
  y += 4;
  if (userName) writeLines(`Candidate: ${userName}`, 11, "normal", [90, 90, 90]);
  writeLines(`Date: ${new Date().toLocaleString()}`, 11, "normal", [90, 90, 90]);
  y += 6;

  // Score summary box
  ensure(70);
  doc.setDrawColor(220);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, maxW, 56, 6, 6, "FD");
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Score: ${score.toFixed(2)} / ${maxMarks}`, margin + 14, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Correct: ${correct}    Wrong: ${wrong}    Skipped: ${skipped}`, margin + 14, y + 44);
  y += 72;

  writeLines("Question Review", 14, "bold");
  y += 2;

  questions.forEach((q, i) => {
    y += 6;
    writeLines(`Q${i + 1}. ${stripHtml(q.questionText)}`, 11, "bold");
    const userAns = answers[q.rowId];
    OPTS.forEach((opt) => {
      const text = stripHtml(q[`option${opt}` as keyof TncQuestion] as string);
      if (!text) return;
      const isCorrect = q.correctAnswer === opt;
      const isUser = userAns === opt;
      let label = `   ${opt}. ${text}`;
      if (isCorrect) label += "  [Correct]";
      if (isUser && !isCorrect) label += "  [Your answer]";
      const color: [number, number, number] = isCorrect ? [22, 130, 60] : isUser ? [190, 40, 40] : [60, 60, 60];
      writeLines(label, 10, isCorrect || isUser ? "bold" : "normal", color);
    });
    if (!userAns) writeLines("   Not answered", 10, "normal", [180, 130, 0]);
    const expl = stripHtml(q.explanation);
    if (expl) writeLines(`   Explanation: ${expl}`, 9, "normal", [100, 100, 100]);
  });

  const safe = (stripHtml(examName) || "tnc-result").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  doc.save(`${safe}-result.pdf`);
}
