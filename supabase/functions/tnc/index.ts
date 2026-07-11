import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CRM_ENDPOINT = Deno.env.get("TNC_CRM_ENDPOINT") ?? "https://crm.tncnursing.in/common/";
const CRM_BASE = Deno.env.get("TNC_CRM_BASE") ?? "https://crm.tncnursing.in";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function fetchFromCRM(payload: Record<string, unknown>) {
  const res = await fetch(CRM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: JSON.stringify(payload) }),
  });
  if (!res.ok) throw new Error(`CRM error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function buildMediaUrl(path: string | null) {
  if (!path) return null;
  const url = path.startsWith("http") ? path : `${CRM_BASE}/${path.replace(/^\//, "")}`;
  // CRM stores filenames with spaces/unsafe chars unencoded — encode so <img> and
  // fetch both work. encodeURI leaves already-valid characters (and %xx) untouched.
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Resolve the authenticated user from the request JWT, or null. */
async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/** Returns true if the user currently has an active, non-expired premium plan. */
async function isPremiumUser(user: { id: string; email?: string | null }) {
  const admin = adminClient();
  const nowIso = new Date().toISOString();
  const orFilter = user.email
    ? `user_id.eq.${user.id},email.eq.${user.email}`
    : `user_id.eq.${user.id}`;
  const { data, error } = await admin
    .from("premium_users")
    .select("expiry_date")
    .or(orFilter)
    .eq("status", "active")
    .gt("expiry_date", nowIso)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("isPremiumUser error", error);
    return false;
  }
  return !!data;
}

/** Returns true if the user has a valid (non-expired) free access verification. */
async function hasValidVerification(userId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("access_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "verified")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("hasValidVerification error", error);
    return false;
  }
  return !!data;
}

/**
 * Access decision for premium-gated TNC exams. Mirrors the main site:
 * premium users get in ad-free; everyone else needs an active free verification.
 * Both checks run server-side so the gate cannot be bypassed from the client.
 */
async function resolveTncAccess(user: { id: string; email?: string | null }) {
  if (await isPremiumUser(user)) return { ok: true as const, premium: true };
  if (await hasValidVerification(user.id)) return { ok: true as const, premium: false };
  return { ok: false as const, premium: false };
}

// ---------------------------------------------------------------------------
// Signed, time-limited PDF download permissions.
// A token authorises ONE attempt's PDF for a short window and is verifiable
// server-side (HMAC-SHA256). Only the attempt owner or an intended shared
// viewer (someone with the share link) can obtain one.
// ---------------------------------------------------------------------------
const PDF_TOKEN_TTL_SECONDS = 300; // 5 minutes

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payloadB64: string) {
  const secret = Deno.env.get("PDF_SIGNING_SECRET") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return b64url(new Uint8Array(sig));
}

async function signPdfToken(payload: { attemptId: string; sub: string; exp: number }) {
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyPdfToken(token: string): Promise<{ attemptId: string; sub: string; exp: number } | null> {
  const [payloadB64, sig] = String(token).split(".");
  if (!payloadB64 || !sig) return null;
  const expected = await hmac(payloadB64);
  if (expected !== sig) return null;
  try {
    const json = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (!json.exp || json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

/** Look up the owner (user_id) of an attempt. */
async function getAttemptOwner(attemptId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from("quiz_attempts")
    .select("user_id")
    .eq("id", attemptId)
    .maybeSingle();
  return data?.user_id ? String(data.user_id) : null;
}



function getIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function logSecurityEvent(ev: {
  eventType: string;
  severity?: string;
  userId?: string | null;
  userName?: string | null;
  ip?: string | null;
  path?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await adminClient().from("security_events").insert([{
      event_type: ev.eventType,
      severity: ev.severity ?? "low",
      user_id: ev.userId ?? null,
      user_name: ev.userName ?? null,
      ip_address: ev.ip ?? null,
      path: ev.path ?? null,
      details: ev.details ?? {},
    }]);
  } catch (e) {
    console.error("logSecurityEvent failed", e);
  }
}

// --- In-memory request tracking for scraping detection (per warm instance) ---
const reqLog = new Map<string, number[]>();
const lastAlert = new Map<string, number>();
const WINDOW_MS = 60_000; // 1 minute sliding window
const FETCH_THRESHOLD = 45; // requests/min from one IP before we flag it
const ALERT_COOLDOWN_MS = 5 * 60_000; // don't spam duplicate alerts

/** Returns the request count in the last minute for this IP. */
function trackRequest(ip: string) {
  const now = Date.now();
  const arr = (reqLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  reqLog.set(ip, arr);
  return arr.length;
}

function shouldAlert(key: string) {
  const now = Date.now();
  const last = lastAlert.get(key) ?? 0;
  if (now - last < ALERT_COOLDOWN_MS) return false;
  lastAlert.set(key, now);
  return true;
}

const ALLOWED_IMG_HOSTS = new Set<string>();
try {
  ALLOWED_IMG_HOSTS.add(new URL(CRM_BASE).host);
} catch {
  /* ignore */
}

/** Proxy a CRM image and return it as a base64 data URL (for PDF embedding). */
async function proxyImage(rawUrl: string) {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image url");
  }
  if (!ALLOWED_IMG_HOSTS.has(target.host)) {
    throw new Error("Image host not allowed");
  }
  const res = await fetch(target.toString());
  if (!res.ok) throw new Error(`Image fetch ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  const base64 = btoa(binary);
  return { dataUrl: `data:${contentType};base64,${base64}`, contentType };
}

function parseExam(row: any) {
  const j = row.json ?? {};
  return {
    examId: row.row_id,
    examNo: row.examno ?? 0,
    name: j._ex_na ?? "Quiz",
    maxMarks: j._ma_ma ?? 0,
    negativeMarks: j._ne_ma ?? 0.33,
    durationMinutes: String(j._ex_du ?? "90"),
    questionCount: (row.qu_refid ?? []).length,
    allowForPremium: j._al_fo_pr === 1,
    createdAt: row.cr_on ?? null,
  };
}

function parseQuestion(row: any) {
  const j = row.json ?? {};
  const quObj = j._qu ?? {};
  const ops = j._op ?? {};
  const soObj = j._so ?? {};
  const imObj = quObj._im ?? {};
  const imgPath = imObj._li ?? null;
  return {
    rowId: row.row_id,
    questionNo: j._qno ?? null,
    questionText: quObj._qu ?? "",
    imageUrl: imgPath ? buildMediaUrl(imgPath) : null,
    optionA: ops._op_A?._op_ti ?? "",
    optionB: ops._op_B?._op_ti ?? "",
    optionC: ops._op_C?._op_ti ?? "",
    optionD: ops._op_D?._op_ti ?? "",
    correctAnswer: j._an ?? "",
    explanation: soObj._ti ?? null,
  };
}

async function listTests(page: number, limit: number) {
  const data = await fetchFromCRM({
    fn: "common_fn",
    se: "fe",
    sch: "t_ex",
    data: { json: "*", qu_refid: "*", examno: "*", row_id: "*", cr_on: "*" },
    cond: {},
  });
  const valid = data.filter((row: any) => (row.qu_refid ?? []).length > 0);
  valid.sort((a: any, b: any) => (b.examno ?? 0) - (a.examno ?? 0));
  const quizzes = valid.slice((page - 1) * limit, page * limit).map(parseExam);
  return { quizzes, total: valid.length, page, limit };
}

async function getTest(examId: string) {
  const examData = await fetchFromCRM({
    fn: "common_fn",
    se: "fe",
    sch: "t_ex",
    data: { json: "*", qu_refid: "*", examno: "*", row_id: "*", cr_on: "*" },
    cond: { row_id: examId },
  });
  if (!examData || examData.length === 0) return null;
  const exam = examData[0];
  const quRefids: string[] = exam.qu_refid ?? [];

  const BATCH = 50;
  const batches: string[][] = [];
  for (let i = 0; i < quRefids.length; i += BATCH) {
    batches.push(quRefids.slice(i, i + BATCH));
  }

  const batchResults = await Promise.all(
    batches.map((batch) =>
      Promise.allSettled(
        batch.map((rowId) =>
          fetchFromCRM({
            fn: "common_fn",
            se: "fe",
            sch: "t_qu",
            data: { json: "*", row_id: "*" },
            cond: { row_id: rowId },
          }),
        ),
      )
    ),
  );

  const questions = batchResults
    .flat()
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (Array.isArray((r as PromiseFulfilledResult<any>).value) ? (r as PromiseFulfilledResult<any>).value : []))
    .map(parseQuestion)
    .filter((q) => q.questionText.trim() !== "");

  questions.sort((a, b) => (a.questionNo ?? 0) - (b.questionNo ?? 0));

  return { ...parseExam(exam), questions };
}

async function saveAttempt(body: any) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error, data } = await admin.from("quiz_attempts").insert([{
    exam_id: String(body.examId ?? ""),
    exam_name: body.examName ?? null,
    user_id: body.userId ?? "guest",
    user_name: body.userName ?? "Guest",
    answers: body.answers ?? {},
    score: body.score ?? 0,
    total_marks: body.totalMarks ?? 0,
    correct_count: body.correctCount ?? 0,
    wrong_count: body.wrongCount ?? 0,
    skipped_count: body.skippedCount ?? 0,
    time_taken_seconds: body.timeTakenSeconds ?? 0,
    submitted_at: new Date().toISOString(),
  }]).select();
  if (error) throw new Error(error.message);
  return data;
}

async function getAttempt(attemptId: string) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin
    .from("quiz_attempts")
    .select("id, exam_id, exam_name, user_name, answers, score, total_marks, correct_count, wrong_count, skipped_count, time_taken_seconds, submitted_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    attemptId: data.id,
    examId: String(data.exam_id ?? ""),
    examName: data.exam_name ?? null,
    userName: data.user_name ?? "Student",
    answers: data.answers ?? {},
    score: Number(data.score ?? 0),
    totalMarks: Number(data.total_marks ?? 0),
    correctCount: Number(data.correct_count ?? 0),
    wrongCount: Number(data.wrong_count ?? 0),
    skippedCount: Number(data.skipped_count ?? 0),
    timeTakenSeconds: Number(data.time_taken_seconds ?? 0),
    submittedAt: data.submitted_at ?? null,
  };
}

async function getLeaderboard(examId: string) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin
    .from("quiz_attempts")
    .select("user_id, user_name, score, total_marks, correct_count, wrong_count, skipped_count, time_taken_seconds, submitted_at, exam_name")
    .eq("exam_id", String(examId))
    .order("score", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  // Keep each user's best attempt (highest score, then fastest time).
  const best = new Map<string, any>();
  for (const row of data ?? []) {
    const key = String(row.user_id ?? "guest");
    const prev = best.get(key);
    if (
      !prev ||
      Number(row.score) > Number(prev.score) ||
      (Number(row.score) === Number(prev.score) &&
        Number(row.time_taken_seconds ?? 0) < Number(prev.time_taken_seconds ?? 0))
    ) {
      best.set(key, row);
    }
  }

  const ranked = [...best.values()]
    .sort((a, b) =>
      Number(b.score) - Number(a.score) ||
      Number(a.time_taken_seconds ?? 0) - Number(b.time_taken_seconds ?? 0),
    )
    .slice(0, 100)
    .map((row, i) => ({
      rank: i + 1,
      userId: String(row.user_id ?? "guest"),
      userName: row.user_name ?? "Student",
      score: Number(row.score ?? 0),
      totalMarks: Number(row.total_marks ?? 0),
      correctCount: Number(row.correct_count ?? 0),
      wrongCount: Number(row.wrong_count ?? 0),
      skippedCount: Number(row.skipped_count ?? 0),
      timeTakenSeconds: Number(row.time_taken_seconds ?? 0),
      submittedAt: row.submitted_at ?? null,
    }));

  return {
    examId: String(examId),
    examName: data?.[0]?.exam_name ?? null,
    rows: ranked,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action = body.action ?? url.searchParams.get("action") ?? "tests";

    // --- Scraping detection: flag IPs that fire too many read requests/min ---
    const ip = getIp(req);
    const reqUserId = body.userId ? String(body.userId) : null;
    if (action === "tests" || action === "test" || action === "image") {
      const count = trackRequest(ip);
      if (count > FETCH_THRESHOLD && shouldAlert(`flood:${ip}`)) {
        await logSecurityEvent({
          eventType: "high_request_volume",
          severity: count > FETCH_THRESHOLD * 2 ? "high" : "medium",
          userId: reqUserId,
          ip,
          path: action,
          details: { requestsPerMinute: count, threshold: FETCH_THRESHOLD },
        });
      }
    }

    // Image proxy — serves CRM images with CORS so PDFs can embed them.
    if (action === "image") {
      const target = body.url ?? url.searchParams.get("url");
      if (!target) return json({ error: "url required" }, 400);
      try {
        const { dataUrl } = await proxyImage(String(target));
        return json({ dataUrl });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Image error" }, 400);
      }
    }

    if (action === "tests") {
      const page = Math.max(1, parseInt(String(body.page ?? url.searchParams.get("page") ?? "1")) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(body.limit ?? url.searchParams.get("limit") ?? "20")) || 20));
      return json(await listTests(page, limit));
    }

    if (action === "test") {
      const examId = body.examId ?? url.searchParams.get("examId");
      if (!examId) return json({ error: "examId required" }, 400);
      const result = await getTest(String(examId));
      if (!result) return json({ error: "Not found" }, 404);

      // SECURITY: premium-gated exams require either an active premium plan OR a
      // valid free access verification (same ad-verify model as the main site).
      // Enforced server-side so the gate cannot be bypassed from the client.
      if (result.allowForPremium) {
        const user = await getAuthUser(req);
        if (!user) return json({ error: "Login required", code: "auth_required" }, 401);
        const access = await resolveTncAccess(user);
        if (!access.ok) {
          return json({ error: "Verification or premium required", code: "verification_required" }, 403);
        }
      }


      // SECURITY: never send answer keys / explanations to the client before
      // the quiz is submitted. Scoring and review happen server-side.
      const safe = {
        ...result,
        questions: result.questions.map((q) => ({
          ...q,
          correctAnswer: "",
          explanation: null,
        })),
      };
      return json(safe);
    }

    // Server-side scoring + save. Requires auth; the user id and score are
    // derived on the server so answer keys never reach the client early and
    // scores/leaderboard cannot be forged.
    if (action === "submit") {
      const user = await getAuthUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);

      const examId = body.examId ?? "";
      if (!examId) return json({ error: "examId required" }, 400);
      const answers: Record<string, string> = body.answers ?? {};
      const timeTakenSeconds = Number(body.timeTakenSeconds ?? 0);

      const exam = await getTest(String(examId));
      if (!exam) return json({ error: "Not found" }, 404);

      // Premium-gated exams: block scoring/saving for non-premium users.
      if (exam.allowForPremium && !(await isPremiumUser(user))) {
        return json({ error: "Premium subscription required", code: "premium_required" }, 403);
      }

      const marksPerQ = exam.questions.length ? exam.maxMarks / exam.questions.length : 0;
      let correct = 0, wrong = 0, skipped = 0;
      const review = exam.questions.map((q) => {
        const ans = answers[q.rowId];
        if (!ans) skipped++;
        else if (ans === q.correctAnswer) correct++;
        else wrong++;
        return { rowId: q.rowId, correctAnswer: q.correctAnswer, explanation: q.explanation };
      });
      const score = Math.max(0, correct * marksPerQ - wrong * exam.negativeMarks);

      const userName = String(body.userName ?? user.user_metadata?.name ?? "Student");
      const saved = await saveAttempt({
        examId, examName: exam.name, userId: user.id, userName, answers,
        score, totalMarks: exam.maxMarks, correctCount: correct, wrongCount: wrong,
        skippedCount: skipped, timeTakenSeconds,
      });
      const attemptId = Array.isArray(saved) && saved[0] ? saved[0].id : null;

      return json({
        attemptId, score, totalMarks: exam.maxMarks,
        correctCount: correct, wrongCount: wrong, skippedCount: skipped,
        review,
      }, 201);
    }


    if (action === "attempt") {
      // Legacy path — now requires auth and derives the user id from the JWT so
      // attempts cannot be forged for other users. Prefer the "submit" action.
      const attemptUser = await getAuthUser(req);
      if (!attemptUser) return json({ error: "Unauthorized" }, 401);
      const saved = await saveAttempt({ ...body, userId: attemptUser.id });
      const attemptId = Array.isArray(saved) && saved[0] ? saved[0].id : null;
      // Flag abnormal submission volume (rapid repeated attempts by same user).
      try {
        if (reqUserId && reqUserId !== "guest") {
          const since = new Date(Date.now() - 5 * 60_000).toISOString();
          const { count } = await adminClient()
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", reqUserId)
            .gte("submitted_at", since);
          if ((count ?? 0) > 8 && shouldAlert(`attempts:${reqUserId}`)) {
            await logSecurityEvent({
              eventType: "high_attempt_volume",
              severity: (count ?? 0) > 20 ? "high" : "medium",
              userId: reqUserId,
              userName: body.userName ?? null,
              ip,
              path: "attempt",
              details: { attemptsLast5Min: count },
            });
          }
        }
      } catch (e) {
        console.error("attempt-volume check failed", e);
      }
      return json({ saved: true, attemptId, data: saved }, 201);
    }


    if (action === "getAttempt") {
      const attemptId = body.attemptId ?? url.searchParams.get("attemptId");
      if (!attemptId) return json({ error: "attemptId required" }, 400);
      const result = await getAttempt(String(attemptId));
      if (!result) return json({ error: "Not found" }, 404);
      return json(result);
    }

    // Answer key for a SUBMITTED attempt (powers the shared-result review page).
    // Gated on a real attempt existing, so it never exposes answers pre-submission.
    if (action === "review") {
      const attemptId = body.attemptId ?? url.searchParams.get("attemptId");
      if (!attemptId) return json({ error: "attemptId required" }, 400);
      const attempt = await getAttempt(String(attemptId));
      if (!attempt) return json({ error: "Not found" }, 404);
      const exam = await getTest(attempt.examId);
      if (!exam) return json({ error: "Not found" }, 404);
      const review = exam.questions.map((q) => ({
        rowId: q.rowId,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));
      return json({ examId: attempt.examId, review });
    }

    // Issue a signed, time-limited permission to download/regenerate a result
    // PDF. Only the attempt owner (verified via JWT) or an intended shared
    // viewer (someone opening the share link) may obtain one.
    if (action === "pdfPermission") {
      const attemptId = String(body.attemptId ?? "");
      if (!attemptId) return json({ error: "attemptId required" }, 400);
      const owner = await getAttemptOwner(attemptId);
      if (!owner) return json({ error: "Not found" }, 404);

      const user = await getAuthUser(req);
      const isOwner = !!user && user.id === owner;
      const isSharedViewer = body.shared === true; // opened via the public share link
      if (!isOwner && !isSharedViewer) {
        return json({ error: "Forbidden" }, 403);
      }

      const exp = Math.floor(Date.now() / 1000) + PDF_TOKEN_TTL_SECONDS;
      const token = await signPdfToken({ attemptId, sub: user?.id ?? "shared", exp });
      return json({ token, expiresAt: new Date(exp * 1000).toISOString() });
    }

    // Verify a PDF permission token (used to gate PDF image proxying).
    if (action === "pdfVerify") {
      const token = String(body.token ?? "");
      const verified = await verifyPdfToken(token);
      return json({ valid: !!verified, ...(verified ?? {}) });
    }


    if (action === "leaderboard") {
      const examId = body.examId ?? url.searchParams.get("examId");
      if (!examId) return json({ error: "examId required" }, 400);
      return json(await getLeaderboard(String(examId)));
    }


    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("tnc error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
