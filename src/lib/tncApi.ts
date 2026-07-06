import { supabase } from "@/integrations/supabase/client";

export interface TncExam {
  examId: string;
  examNo: number;
  name: string;
  maxMarks: number;
  negativeMarks: number;
  durationMinutes: string;
  questionCount: number;
  allowForPremium: boolean;
  createdAt: string | null;
}

export interface TncQuestion {
  rowId: string;
  questionNo: number | null;
  questionText: string;
  imageUrl: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
}

export interface TncExamWithQuestions extends TncExam {
  questions: TncQuestion[];
}

export interface TncListResponse {
  quizzes: TncExam[];
  total: number;
  page: number;
  limit: number;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tnc", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function fetchTncTests(page: number, limit = 20) {
  return call<TncListResponse>({ action: "tests", page, limit });
}

export function fetchTncTest(examId: string) {
  return call<TncExamWithQuestions>({ action: "test", examId });
}

/**
 * Shared module-level cache of proxied images: original CRM URL -> base64 data URL.
 * Reused by both the on-screen image component and the PDF exporter so an image is
 * only ever proxied once per session (fewer network calls, faster quiz loads).
 */
const dataUrlCache = new Map<string, string>();
/** In-flight requests so concurrent callers await the same fetch instead of duplicating it. */
const inflight = new Map<string, Promise<string | null>>();

/** Synchronously read a cached proxied data URL, if we already have one. */
export function getCachedTncImage(url: string): string | undefined {
  return dataUrlCache.get(url);
}

/** Proxy a CRM image through the edge function and return a base64 data URL (CORS-safe, cached). */
export async function fetchTncImageDataUrl(url: string): Promise<string | null> {
  const cached = dataUrlCache.get(url);
  if (cached) return cached;

  const pending = inflight.get(url);
  if (pending) return pending;

  const p = (async () => {
    try {
      const res = await call<{ dataUrl: string }>({ action: "image", url });
      const dataUrl = res?.dataUrl ?? null;
      if (dataUrl) dataUrlCache.set(url, dataUrl);
      return dataUrl;
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, p);
  return p;
}

export interface SaveAttemptPayload {
  examId: string;
  examName: string;
  userId?: string;
  userName?: string;
  answers: Record<string, string>;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
}

export function saveTncAttempt(payload: SaveAttemptPayload) {
  return call<{ saved: boolean; attemptId: string | null }>({ action: "attempt", ...payload });
}

/** Answer key + explanation for one question, returned only AFTER submission. */
export interface TncReviewItem {
  rowId: string;
  correctAnswer: string;
  explanation: string | null;
}

export interface TncSubmitResult {
  attemptId: string | null;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  review: TncReviewItem[];
}

export interface SubmitAttemptPayload {
  examId: string;
  userName?: string;
  answers: Record<string, string>;
  timeTakenSeconds: number;
}

/**
 * Submit a quiz for SERVER-SIDE scoring. Answer keys are never sent to the
 * browser before this call; the server grades using the CRM answer key,
 * derives the user from the JWT, saves the attempt, and returns the score plus
 * the answer key for review.
 */
export function submitTncAttempt(payload: SubmitAttemptPayload) {
  return call<TncSubmitResult>({ action: "submit", ...payload });
}


export interface TncSharedAttempt {
  attemptId: string;
  examId: string;
  examName: string | null;
  userName: string;
  answers: Record<string, string>;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  submittedAt: string | null;
}

export function fetchTncAttempt(attemptId: string) {
  return call<TncSharedAttempt>({ action: "getAttempt", attemptId });
}

export interface TncLeaderboardRow {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  submittedAt: string | null;
}

export interface TncLeaderboardResponse {
  examId: string;
  examName: string | null;
  rows: TncLeaderboardRow[];
}

export function fetchTncLeaderboard(examId: string) {
  return call<TncLeaderboardResponse>({ action: "leaderboard", examId });
}

export function getCategory(name = ""): string {
  const n = name.toUpperCase();
  if (n.includes("NORCET")) return "NORCET";
  if (n.includes("AIIMS")) return "AIIMS";
  if (n.includes("SGPGI")) return "SGPGI";
  if (n.includes("BTSC")) return "BTSC";
  if (n.includes("CHO")) return "CHO";
  if (n.includes("CHN")) return "CHN";
  if (n.includes("OT ") || n.includes("THEATRE")) return "OT";
  if (n.includes("MORNING") || n.includes("DOSE")) return "Daily Dose";
  return "Other";
}
