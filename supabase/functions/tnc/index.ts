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
  if (path.startsWith("http")) return path;
  return `${CRM_BASE}/${path.replace(/^\//, "")}`;
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
      return json(result);
    }

    if (action === "attempt") {
      const saved = await saveAttempt(body);
      return json({ saved: true, data: saved }, 201);
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
