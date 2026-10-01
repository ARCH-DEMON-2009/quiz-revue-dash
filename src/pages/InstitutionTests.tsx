import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, BookOpen, Building2, Check, Loader2, RefreshCw, Search, Star } from "lucide-react";
import {
  fetchInstitutions,
  fetchQuestions,
  fetchSeries,
  fetchSubjects,
  fetchTitles,
  type Institution,
  type InstitutionQuestion,
  type InstitutionRow,
} from "@/lib/institutionQuizApi";

type Titles = Awaited<ReturnType<typeof fetchTitles>>;
type QuizPhase = "ready" | "taking" | "results";
const FAVORITES_KEY = "institution_quiz_favorites";

function htmlForDisplay(value: unknown, sourceUrl: string) {
  if (typeof value !== "string") return "";
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "sub", "sup", "br", "p", "span", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", "div", "img"],
    ALLOWED_ATTR: ["src", "alt", "title", "width", "height"],
  });
  const document = new DOMParser().parseFromString(clean, "text/html");
  document.querySelectorAll("img").forEach((image) => {
    const rawSource = image.getAttribute("src");
    try {
      if (!rawSource) throw new Error("Missing image URL");
      const imageUrl = new URL(rawSource, sourceUrl);
      if (imageUrl.protocol !== "https:") throw new Error("Insecure image URL");
      image.src = imageUrl.toString();
    } catch {
      image.remove();
    }
  });
  return document.body.innerHTML;
}

function SafeHtml({ value, sourceUrl, className = "" }: { value: unknown; sourceUrl: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: htmlForDisplay(value, sourceUrl) }} />;
}

function secureImage(value: unknown, sourceUrl: string) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, sourceUrl);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function secureLink(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function idOf(row: InstitutionRow, field: "id" | "subjectid") {
  const value = row[field];
  return value === undefined || value === null ? "" : String(value);
}

function subjectLabel(subject: InstitutionRow | null, series: InstitutionRow | null) {
  const subjectName = typeof subject?.subject_name === "string" ? subject.subject_name.trim() : "";
  const isPlaceholder = (value: string) => /^un[\s_-]*categori[sz]ed$/i.test(value);
  if (subjectName && !isPlaceholder(subjectName)) return subjectName;
  const examName = typeof series?.examname === "string" ? series.examname.trim() : "";
  return examName && !isPlaceholder(examName) ? examName : "General";
}

function choicesFor(question: InstitutionQuestion) {
  return Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    const text = question[`option_${number}`];
    const image = question[`option_image_${number}`];
    return { id: String(number), text, image };
  }).filter((choice) => (typeof choice.text === "string" && choice.text.trim()) || (typeof choice.image === "string" && choice.image.trim()));
}

function answerParts(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((part) => part.trim()).filter(Boolean).sort();
  if (typeof value === "number") return [String(value)];
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(/[;,|]/).map((part) => part.trim()).filter(Boolean).sort();
}

function marksValue(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMultiAnswer(question: InstitutionQuestion) {
  return `${question.question_type ?? ""} ${question.question_ui_type ?? ""}`.toLowerCase().match(/multi|checkbox|multiple answer/) !== null;
}

export default function InstitutionTests() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
    } catch { return []; }
  });
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [series, setSeries] = useState<InstitutionRow[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<InstitutionRow | null>(null);
  const [subjects, setSubjects] = useState<InstitutionRow[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<InstitutionRow | null>(null);
  const [titles, setTitles] = useState<Titles>({ tests: [], pdfs: [], subjective: [] });
  const [selectedTest, setSelectedTest] = useState<InstitutionRow | null>(null);
  const [questions, setQuestions] = useState<InstitutionQuestion[]>([]);
  const [questionSource, setQuestionSource] = useState("");
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("ready");
  const [reviewingResults, setReviewingResults] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    fetchInstitutions()
      .then(setInstitutions)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Couldn't load institutions."))
      .finally(() => setLoadingDirectory(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* storage may be unavailable */ }
  }, [favorites]);

  const resetQuiz = () => {
    setSelectedTest(null);
    setQuestions([]);
    setQuestionSource("");
    setQuizPhase("ready");
    setReviewingResults(false);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizScore(0);
  };

  const chooseInstitution = async (next: Institution) => {
    const request = ++requestId.current;
    setInstitution(next);
    setSeries([]);
    setSelectedSeries(null);
    setSubjects([]);
    setSelectedSubject(null);
    setTitles({ tests: [], pdfs: [], subjective: [] });
    resetQuiz();
    setError("");
    setLoading(true);
    try {
      const rows = await fetchSeries(next.api);
      if (request === requestId.current) setSeries(rows);
    } catch (reason) {
      if (request === requestId.current) setError(reason instanceof Error ? reason.message : "Couldn't load test series.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const chooseSeries = async (next: InstitutionRow) => {
    if (!institution) return;
    const id = idOf(next, "id");
    const request = ++requestId.current;
    setSelectedSeries(next);
    setSubjects([]);
    setSelectedSubject(null);
    setTitles({ tests: [], pdfs: [], subjective: [] });
    resetQuiz();
    setError("");
    setLoading(true);
    try {
      const rows = await fetchSubjects(institution.api, id);
      if (request === requestId.current) setSubjects(rows);
    } catch (reason) {
      if (request === requestId.current) setError(reason instanceof Error ? reason.message : "Couldn't load subjects.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const chooseSubject = async (next: InstitutionRow) => {
    if (!institution || !selectedSeries) return;
    const request = ++requestId.current;
    setSelectedSubject(next);
    setTitles({ tests: [], pdfs: [], subjective: [] });
    resetQuiz();
    setError("");
    setLoading(true);
    try {
      const result = await fetchTitles(institution.api, idOf(selectedSeries, "id"), idOf(next, "subjectid"));
      if (request === requestId.current) setTitles(result);
    } catch (reason) {
      if (request === requestId.current) setError(reason instanceof Error ? reason.message : "Couldn't load tests.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const chooseTest = async (test: InstitutionRow) => {
    const request = ++requestId.current;
    resetQuiz();
    setError("");
    setLoading(true);
    try {
      const result = await fetchQuestions(test);
      if (request !== requestId.current) return;
      setSelectedTest(test);
      setQuestions(result.questions);
      setQuestionSource(result.sourceUrl);
    } catch (reason) {
      if (request === requestId.current) setError(reason instanceof Error ? reason.message : "Couldn't load questions.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const leaveQuiz = () => {
    requestId.current += 1;
    resetQuiz();
    setError("");
  };

  const submitQuiz = () => {
    let score = 0;
    questions.forEach((question, index) => {
      const expected = answerParts(question.answer);
      const actual = answers[index] ?? [];
      if (expected.length && expected.join("|") === [...actual].sort().join("|")) {
        score += marksValue(question.positive_marks, 1);
      } else if (actual.length) {
        score -= marksValue(question.negative_marks, 0);
      }
    });
    setQuizScore(score);
    setReviewingResults(true);
    setQuizPhase("results");
  };

  const visibleInstitutions = institutions.filter((item) =>
    (!favoritesOnly || favorites.includes(item.api)) && item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const question = questions[currentQuestion];
  const questionChoices = question ? choicesFor(question) : [];
  const isMulti = question ? isMultiAnswer(question) : false;
  const favorite = institution ? favorites.includes(institution.api) : false;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Institution Quizzes | Test Sagar</title><meta name="description" content="Browse institutions and take their available practice quizzes." /></Helmet>
      <NavigationHeader showFullNav />
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-8 border-b border-border pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700"><Building2 className="h-4 w-4" /> Open quiz directory</p>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Institution quizzes</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">Find a learning provider, explore its test series, and practice from its question bank.</p>
            </div>
            {institution && <Button variant="outline" onClick={() => { requestId.current += 1; setInstitution(null); setSeries([]); setSelectedSeries(null); setSubjects([]); setSelectedSubject(null); setTitles({ tests: [], pdfs: [], subjective: [] }); leaveQuiz(); }}><ArrowLeft className="mr-2 h-4 w-4" /> All institutions</Button>}
          </div>
          {institution && <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <button className="font-medium text-primary hover:underline" onClick={() => { setInstitution(null); setSeries([]); setSelectedSeries(null); setSubjects([]); setSelectedSubject(null); setTitles({ tests: [], pdfs: [], subjective: [] }); leaveQuiz(); }}>{institution.name}</button>
            {selectedSeries && <><span className="text-muted-foreground">/</span><button className="font-medium text-primary hover:underline" onClick={() => { setSelectedSeries(null); setSubjects([]); setSelectedSubject(null); setTitles({ tests: [], pdfs: [], subjective: [] }); leaveQuiz(); }}>{String(selectedSeries.title ?? "Series")}</button></>}
            {selectedSubject && <><span className="text-muted-foreground">/</span><button className="font-medium text-primary hover:underline" onClick={() => { setSelectedSubject(null); setTitles({ tests: [], pdfs: [], subjective: [] }); leaveQuiz(); }}>{subjectLabel(selectedSubject, selectedSeries)}</button></>}
            {selectedTest && <><span className="text-muted-foreground">/</span><span className="font-medium">{String(selectedTest.title ?? "Quiz")}</span></>}
          </div>}
        </header>

        {!institution ? <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search institutions" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Button variant={favoritesOnly ? "default" : "outline"} onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly}><Star className={`mr-2 h-4 w-4 ${favoritesOnly ? "fill-current" : ""}`} /> Favorites{favorites.length ? ` (${favorites.length})` : ""}</Button>
          </div>
          {loadingDirectory ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div> : error && institutions.length === 0 ? <Card className="flex flex-col items-center gap-3 p-10 text-center"><p className="text-muted-foreground">{error}</p><Button variant="outline" onClick={() => { setError(""); setLoadingDirectory(true); fetchInstitutions().then(setInstitutions).catch((reason) => setError(reason instanceof Error ? reason.message : "Couldn't load institutions.")).finally(() => setLoadingDirectory(false)); }}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></Card> : visibleInstitutions.length === 0 ? <div className="py-16 text-center text-muted-foreground">{favoritesOnly && favorites.length === 0 ? "You have not favorited any institutions yet." : "No institutions match your search."}</div> : <>
            <p className="mb-3 text-sm text-muted-foreground">{visibleInstitutions.length.toLocaleString()} institutions</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleInstitutions.map((item) => {
              const isFavorite = favorites.includes(item.api);
              return <Card key={`${item.name}:${item.api}`} className="flex min-w-0 items-center gap-3 p-4 transition-colors hover:border-emerald-500/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700"><Building2 className="h-5 w-5" /></div>
                <button className="min-w-0 flex-1 text-left" onClick={() => chooseInstitution(item)}><span className="block truncate font-semibold">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">Browse available quizzes</span></button>
                <Button variant="ghost" size="icon" aria-label={isFavorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`} aria-pressed={isFavorite} onClick={() => setFavorites((current) => isFavorite ? current.filter((api) => api !== item.api) : [...current, item.api])}><Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-500" : ""}`} /></Button>
              </Card>;
            })}</div>
          </>}
        </> : <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold">{selectedTest ? String(selectedTest.title ?? "Quiz") : selectedSubject ? "Available tests" : selectedSeries ? "Subjects" : "Test series"}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedTest ? `${questions.length} questions` : selectedSubject ? `${titles.tests.length} question-based quizzes` : selectedSeries ? `${subjects.length} subjects` : `${series.length} series`}</p></div>
            <Button variant="outline" size="icon" title={favorite ? "Remove institution from favorites" : "Add institution to favorites"} aria-label={favorite ? "Remove institution from favorites" : "Add institution to favorites"} aria-pressed={favorite} onClick={() => setFavorites((current) => favorite ? current.filter((api) => api !== institution.api) : [...current, institution.api])}><Star className={`h-4 w-4 ${favorite ? "fill-amber-400 text-amber-500" : ""}`} /></Button>
          </div>
          {error && <Card className="mb-5 flex items-center justify-between gap-4 border-destructive/40 p-4"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => selectedTest ? chooseTest(selectedTest) : selectedSubject ? chooseSubject(selectedSubject) : selectedSeries ? chooseSeries(selectedSeries) : institution && chooseInstitution(institution)}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></Card>}

          {selectedTest ? <>
            {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading question file</div> : quizPhase === "ready" ? <Card className="mx-auto max-w-2xl p-6 sm:p-8"><Badge variant="secondary" className="mb-4">Question-based quiz</Badge><h3 className="text-2xl font-bold">{String(selectedTest.title ?? "Quiz")}</h3><p className="mt-3 text-muted-foreground">{questions.length} questions in this quiz. Your answers are scored when you submit.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button className="gap-2" disabled={!questions.length} onClick={() => { setQuizPhase("taking"); setReviewingResults(false); setCurrentQuestion(0); }}><BookOpen className="h-4 w-4" /> {questions.length ? "Start quiz" : "No questions available"}</Button><Button variant="outline" onClick={leaveQuiz}>Back to tests</Button></div></Card> : quizPhase === "results" ? <Card className="mx-auto max-w-2xl p-6 sm:p-8"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700"><Check className="h-6 w-6" /></div><h3 className="text-2xl font-bold">Quiz complete</h3><p className="mt-2 text-muted-foreground">Score: {quizScore} · {Object.keys(answers).length} of {questions.length} answered</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => { setQuizPhase("taking"); setCurrentQuestion(0); }}>Review answers</Button><Button variant="outline" onClick={leaveQuiz}>Back to tests</Button></div></Card> : question ? <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <Card className="p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3"><Badge variant="secondary">Question {currentQuestion + 1} / {questions.length}</Badge>{reviewingResults ? <Button variant="outline" size="sm" onClick={() => setQuizPhase("results")}>View results</Button> : <Button variant="outline" size="sm" onClick={submitQuiz}>Submit quiz</Button>}</div>
                <SafeHtml value={question.question_heading ?? question.heading} sourceUrl={questionSource} className="mb-3 font-semibold" />
                <SafeHtml value={question.question ?? question.directive ?? question.instructions} sourceUrl={questionSource} className="prose prose-sm max-w-none text-foreground" />
                <div className="my-4 flex flex-wrap gap-3">{[1, 2, 3].map((number) => { const source = secureImage(question[`image_link_${number}`], questionSource); return source ? <img key={number} src={source} alt="Question illustration" loading="lazy" className="max-h-64 max-w-full rounded-md object-contain" /> : null; })}</div>
                {questionChoices.length ? <div className="mt-6 space-y-2">{questionChoices.map((choice) => {
                  const selected = (answers[currentQuestion] ?? []).includes(choice.id);
                  const optionImage = secureImage(choice.image, questionSource);
                  const correct = answerParts(question.answer).includes(choice.id);
                  return <button key={choice.id} disabled={reviewingResults} aria-pressed={selected} onClick={() => setAnswers((current) => {
                    const previous = current[currentQuestion] ?? [];
                    const next = isMulti ? (selected ? previous.filter((value) => value !== choice.id) : [...previous, choice.id]) : [choice.id];
                    return { ...current, [currentQuestion]: next };
                  })} className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${reviewingResults && correct ? "border-emerald-600 bg-emerald-500/10" : selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${reviewingResults && correct ? "border-emerald-700 bg-emerald-700 text-white" : selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`}>{reviewingResults && correct ? <Check className="h-3 w-3" /> : selected && <Check className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><SafeHtml value={choice.text} sourceUrl={questionSource} className="prose prose-sm max-w-none" />{optionImage && <img src={optionImage} alt="Answer option" loading="lazy" className="mt-2 max-h-48 max-w-full object-contain" />}</span></button>;
                })}</div> : <textarea disabled={reviewingResults} className="mt-6 min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm disabled:opacity-70" aria-label="Your answer" value={(answers[currentQuestion] ?? [""])[0] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [currentQuestion]: event.target.value ? [event.target.value] : [] }))} placeholder="Type your answer" />}
                {reviewingResults && <div className="mt-6 rounded-md bg-muted p-4 text-sm"><p className="mb-2 font-semibold">Answer and explanation</p><SafeHtml value={question.solution_heading} sourceUrl={questionSource} /><SafeHtml value={question.solution_text} sourceUrl={questionSource} className="mt-2" /><div className="mt-3 flex flex-wrap gap-3">{[1, 2].map((number) => { const source = secureImage(question[`solution_image_${number}`], questionSource); return source ? <img key={number} src={source} alt="Solution illustration" loading="lazy" className="max-h-64 max-w-full object-contain" /> : null; })}</div>{secureLink(question.solution_video) && <a href={secureLink(question.solution_video) ?? undefined} target="_blank" rel="noreferrer" className="mt-3 inline-block font-medium text-primary hover:underline">Open solution video</a>}</div>}
                <div className="mt-7 flex justify-between"><Button variant="outline" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((index) => index - 1)}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>{currentQuestion + 1 === questions.length ? <Button onClick={submitQuiz}>Finish quiz</Button> : <Button onClick={() => setCurrentQuestion((index) => index + 1)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
              </Card>
              <Card className="h-fit p-4"><p className="mb-3 text-sm font-semibold">Question map</p><div className="grid grid-cols-5 gap-2">{questions.map((_, index) => <button key={index} aria-label={`Go to question ${index + 1}`} onClick={() => setCurrentQuestion(index)} className={`aspect-square rounded-md text-sm ${currentQuestion === index ? "bg-primary text-primary-foreground" : answers[index]?.length ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>{index + 1}</button>)}</div></Card>
            </div> : null}
          </> : loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading directory</div> : selectedSubject ? <div className="space-y-6">
            {titles.tests.length ? <section><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interactive quizzes</h3><div className="grid gap-3 sm:grid-cols-2">{titles.tests.map((test, index) => <Card key={`${idOf(test, "id")}:${index}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold">{String(test.title ?? "Untitled quiz")}</p><p className="mt-1 text-sm text-muted-foreground">{test.questions ? `${String(test.questions)} listed questions` : "Question count loads with quiz"}</p></div><Button size="sm" onClick={() => chooseTest(test)}>Open <ArrowRight className="ml-2 h-4 w-4" /></Button></Card>)}</div></section> : <p className="py-8 text-center text-muted-foreground">No question-based quizzes are available for this subject.</p>}
            {titles.pdfs.length > 0 && <section><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">PDF papers</h3><div className="grid gap-3 sm:grid-cols-2">{titles.pdfs.map((paper, index) => { const pdfUrl = secureLink(paper.pdf_url); return <Card key={`${idOf(paper, "id")}:${index}`} className="flex items-center justify-between gap-3 p-4"><span className="font-medium">{String(paper.title ?? "PDF paper")}</span>{pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open PDF</a> : <Badge variant="outline">PDF</Badge>}</Card>; })}</div></section>}
            {titles.subjective.length > 0 && <section><h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subjective tests</h3><div className="grid gap-3 sm:grid-cols-2">{titles.subjective.map((item, index) => { const pdfUrl = secureLink(item.pdf_url); const hasQuestions = Boolean(item.test_questions_url || item.test_questions_url_2); return <Card key={`${idOf(item, "id")}:${index}`} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{String(item.title ?? "Subjective test")}</p><p className="mt-1 text-xs text-muted-foreground">{hasQuestions ? "Question-based format" : pdfUrl ? "PDF format" : "No supported format"}</p></div>{hasQuestions ? <Button size="sm" onClick={() => chooseTest(item)}>Open</Button> : pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open PDF</a> : null}</Card>; })}</div></section>}
          </div> : selectedSeries ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.length ? subjects.map((item, index) => <Card key={`${idOf(item, "subjectid")}:${index}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold">{subjectLabel(item, selectedSeries)}</p></div><Button variant="outline" size="sm" onClick={() => chooseSubject(item)}>View tests <ArrowRight className="ml-2 h-4 w-4" /></Button></Card>) : <p className="col-span-full py-8 text-center text-muted-foreground">No subjects are available in this series.</p>}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{series.length ? series.map((item, index) => <Card key={`${idOf(item, "id")}:${index}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold">{String(item.title ?? "Untitled series")}</p></div><Button variant="outline" size="sm" onClick={() => chooseSeries(item)}>View subjects <ArrowRight className="ml-2 h-4 w-4" /></Button></Card>) : <p className="col-span-full py-8 text-center text-muted-foreground">No series are available for this institution.</p>}</div>}
        </>}
      </main>
      <Footer />
    </div>
  );
}