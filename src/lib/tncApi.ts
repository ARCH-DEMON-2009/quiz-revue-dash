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
  /** Category resolved on the server (explicit field, not guessed in the UI). */
  category?: string;
  /** Human-readable explanation of why this category was chosen. */
  categoryReason?: string;
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
  /** True when the test came from the offline backup because the provider was unreachable. */
  cached?: boolean;
}

export interface TncListResponse {
  quizzes: TncExam[];
  total: number;
  page: number;
  limit: number;
  /** Counts per category across the WHOLE catalogue (not just this page). */
  categoryCounts?: Record<string, number>;
  /** True when the list came from the offline backup because the provider was unreachable. */
  cached?: boolean;
}

export class TncApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "TncApiError";
    this.code = code;
    this.status = status;
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tnc", { body });
  if (error) {
    // '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
    //                                         
    //                                             
    //                                             Edge Function returned a non-2xx status code
    let message = error.message;
    let code: string | undefined;
    let status: number | undefined;
    try {
      const ctx = (error as any).context as { status?: number; json?: () => Promise<any> };
      status = ctx?.status;
      if (ctx && typeof ctx.json === "function") {
        const parsed = await ctx.json();
        message = parsed?.error ?? message;
        code = parsed?.code;
      }
    } catch { /* ignore parse errors */ }
    throw new TncApiError(message, code, status);
  }
  if (data?.error) throw new TncApiError(data.error, data.code);
  return data as T;
}

export function fetchTncTests(page: number, limit = 20, search = "", category = "All") {
  return call<TncListResponse>({ action: "tests", page, limit, search, category });
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
  questionSnapshot: TncQuestion[];
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

/** Fetch the answer key for a submitted attempt (for the shared review page). */
export function fetchTncReview(attemptId: string) {
  return call<{ examId: string; review: TncReviewItem[] }>({ action: "review", attemptId });
}

/**
 * Request a signed, time-limited permission to download/regenerate a result
 * PDF. The server authorises only the attempt owner (via JWT) or an intended
 * shared viewer (opening the share link). Throws if not permitted.
 */
export function requestTncPdfPermission(attemptId: string, shared = false) {
  return call<{ token: string; expiresAt: string }>({
    action: "pdfPermission",
    attemptId,
    shared,
  });
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
  isPremium?: boolean;
  isAdmin?: boolean;
  planType?: string;
  avatarUrl?: string | null;
}


export interface TncLeaderboardResponse {
  examId: string;
  examName: string | null;
  rows: TncLeaderboardRow[];
}

export function fetchTncLeaderboard(examId: string) {
  return call<TncLeaderboardResponse>({ action: "leaderboard", examId });
}

export type TncLeaderboardPeriod = "daily" | "monthly" | "all";

export interface TncGlobalLeaderboardRow {
  rank: number;
  userId: string;
  userName: string;
  testsTaken: number;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  lastAttemptAt: string | null;
  isPremium: boolean;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  planType?: string;
}

export interface TncGlobalLeaderboardResponse {
  period: TncLeaderboardPeriod;
  totalUsers: number;
  rows: TncGlobalLeaderboardRow[];
}

/** Overall TNC ranking across every test series, by time period. */
export function fetchTncGlobalLeaderboard(period: TncLeaderboardPeriod = "all") {
  return call<TncGlobalLeaderboardResponse>({ action: "globalLeaderboard", period });
}


/**
 * Category rules, mirrored from the server (same order, same keywords) so the
 * fallback classification and the tooltip explanations always agree.
 */
export const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "Daily Dose", keywords: ["MORNING", "DOSE", "DAILY", "OFFLINE", "RRB"] },
  { category: "NORCET", keywords: ["NORCET"] },
  { category: "AIIMS", keywords: ["AIIMS"] },
  { category: "SGPGI", keywords: ["SGPGI"] },
  { category: "BTSC", keywords: ["BTSC"] },
  { category: "CHO", keywords: ["CHO"] },
  { category: "CHN", keywords: ["CHN"] },
  { category: "OT", keywords: ["OT ", "THEATRE"] },
];

export function classifyCategory(name = ""): { category: string; reason: string } {
  const n = name.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    const hit = rule.keywords.find((k) => n.includes(k));
    if (hit) {
      return {
        category: rule.category,
        reason: `Test name contains "${hit.trim()}", so it is grouped under ${rule.category}.`,
      };
    }
  }
  return {
    category: "Other",
    reason: "Test name matches none of the exam keywords, so it is grouped under Other.",
  };
}

/** Prefer the server's explicit category; fall back to the shared name rules. */
export function examCategoryOf(exam: TncExam): string {
  return exam.category ?? classifyCategory(exam.name).category;
}

export function examCategoryReason(exam: TncExam): string {
  return exam.categoryReason ?? classifyCategory(exam.name).reason;
}

export function getCategory(name = ""): string {
  return classifyCategory(name).category;
}
