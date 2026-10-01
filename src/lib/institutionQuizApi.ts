export interface Institution {
  name: string;
  api: string;
}

export interface InstitutionRow {
  [key: string]: unknown;
  id?: string | number;
  title?: string;
  subjectid?: string | number;
  subject_name?: string;
  test_questions_url?: string;
  test_questions_url_2?: string;
}

export interface InstitutionQuestion {
  [key: string]: unknown;
  question?: string;
  question_heading?: string;
  directive?: string;
  heading?: string;
  instructions?: string;
  answer?: string | number | string[];
  question_type?: string;
  question_ui_type?: string;
  positive_marks?: string | number;
  negative_marks?: string | number;
}

async function getJson<T>(url: URL | string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/(application\/json|\+json)(;|$)/i.test(contentType)) {
    throw new Error("The institution API is not available on this deployment. Please try again after the site has been updated.");
  }
  return response.json() as Promise<T>;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchInstitutions(): Promise<Institution[]> {
  const payload = await getJson<{ institutions?: unknown }>("/api/test-series/registry");
  if (!Array.isArray(payload?.institutions)) {
    throw new Error("The institution registry response was not a list.");
  }

  const unique = new Map<string, Institution>();
  for (const item of payload.institutions) {
    if (!item || typeof item.name !== "string" || !item.name.trim() || !isHttpsUrl(item.api)) continue;
    unique.set(`${item.name.trim()}\n${item.api}`, { name: item.name.trim(), api: item.api });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchAction(apiUrl: string, action: "series" | "subjects" | "titles", testId?: string, subjectId?: string) {
  const url = new URL("/api/test-series/action", window.location.origin);
  url.searchParams.set("api_url", apiUrl);
  url.searchParams.set("action", action);
  if (testId !== undefined) url.searchParams.set("test_id", testId);
  if (subjectId !== undefined) url.searchParams.set("subject_id", subjectId);
  return getJson<{ data?: unknown }>(url);
}

function rowsFromData(payload: { data?: unknown }): InstitutionRow[] {
  const upstream = payload?.data;
  const rows = upstream && typeof upstream === "object" && "data" in upstream
    ? (upstream as { data?: unknown }).data
    : upstream;
  return Array.isArray(rows) ? rows as InstitutionRow[] : [];
}

export async function fetchSeries(apiUrl: string) {
  return rowsFromData(await fetchAction(apiUrl, "series"));
}

export async function fetchSubjects(apiUrl: string, seriesId: string) {
  return rowsFromData(await fetchAction(apiUrl, "subjects", seriesId));
}

export async function fetchTitles(apiUrl: string, seriesId: string, subjectId: string) {
  const payload = await fetchAction(apiUrl, "titles", seriesId, subjectId);
  const upstream = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : {};
  const data = upstream.data && typeof upstream.data === "object"
    ? upstream.data as Record<string, unknown>
    : upstream;
  const asRows = (value: unknown) => Array.isArray(value) ? value as InstitutionRow[] : [];
  return {
    tests: asRows(data.test_titles),
    pdfs: asRows(data.test_pdf),
    subjective: asRows(data.test_subjective),
  };
}

export async function fetchQuestions(test: InstitutionRow): Promise<{ questions: InstitutionQuestion[]; sourceUrl: string }> {
  const questionUrl = test.test_questions_url || test.test_questions_url_2;
  if (!questionUrl) throw new Error("This test does not provide a question JSON URL.");

  const url = new URL("/api/test-series/questions", window.location.origin);
  url.searchParams.set("url", questionUrl);
  const payload = await getJson<{ questions?: unknown; source_url?: unknown }>(url);
  if (!Array.isArray(payload?.questions)) {
    throw new Error("The question response did not contain a question list.");
  }
  const sourceUrl = isHttpsUrl(payload.source_url) ? payload.source_url : questionUrl;
  if (!isHttpsUrl(sourceUrl)) throw new Error("The question source URL is not secure.");
  return { questions: payload.questions as InstitutionQuestion[], sourceUrl };
}