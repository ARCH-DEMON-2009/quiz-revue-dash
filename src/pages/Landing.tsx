import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import Hero3D from "@/components/Hero3D";
import {
  BookOpen,
  Timer,
  BarChart3,
  Trophy,
  FileDown,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const SITE = "https://test.shashanksv.com";

const FEATURES = [
  {
    icon: Timer,
    title: "Real exam timing",
    body: "Every mock test runs on a live countdown with the same per-question pacing you get in the actual exam hall, so you learn to manage time before it costs you marks.",
    span: "lg:col-span-3",
  },
  {
    icon: BookOpen,
    title: "Explained solutions",
    body: "After you submit, each question opens with the correct option and a written explanation, so a wrong answer becomes a revision note instead of a mystery.",
    span: "lg:col-span-3",
  },
  {
    icon: BarChart3,
    title: "Subject-wise analytics",
    body: "Accuracy, attempt rate and time spent are broken down per subject and per attempt, so you can see whether Physics numericals or Nursing fundamentals need the next study hour.",
    span: "lg:col-span-2",
  },
  {
    icon: Trophy,
    title: "All-India rankings",
    body: "Each test has a leaderboard with rank and percentile against everyone who attempted it, plus a global leaderboard across the whole test series.",
    span: "lg:col-span-2",
  },
  {
    icon: FileDown,
    title: "Downloadable result PDFs",
    body: "Take your full paper, your answers and the solutions offline as a formatted PDF report you can print or revise from without opening the site.",
    span: "lg:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Fair, secure attempts",
    body: "Answer keys never reach the browser during an attempt and scoring is validated on our servers, which keeps every leaderboard rank honest.",
    span: "lg:col-span-6",
  },
];

const EXAMS = [
  {
    name: "NEET & medical entrance",
    body: "Full-length and chapter-wise papers across Physics, Chemistry, Botany and Zoology, weighted the way the NEET paper distributes its 180 questions, with negative marking applied exactly as in the real test.",
  },
  {
    name: "JEE & engineering entrance",
    body: "Mathematics, Physics and Chemistry sets covering both the objective and numerical-answer formats, useful for building speed on multi-step problems where partial guessing does not pay.",
  },
  {
    name: "TNC nursing test series",
    body: "Thousands of nursing papers spanning anatomy, physiology, medical-surgical nursing, community health, midwifery and nursing foundations, each with instant scoring, solutions and a per-test leaderboard.",
  },
  {
    name: "Class-wise practice sets",
    body: "Board-level practice organised by class and stream, for students who want to strengthen syllabus fundamentals before moving on to competitive-exam mocks.",
  },
];

const STEPS = [
  {
    title: "Create a free account",
    body: "Sign up with an email address. Free accounts get thousands of mock tests, solutions, analytics and leaderboard access without any payment.",
  },
  {
    title: "Pick your exam and stream",
    body: "Choose your class or exam track, then pick a paper. Each listing shows the question count, total marks, negative marking and duration up front.",
  },
  {
    title: "Attempt it like the real thing",
    body: "Work through the paper with the live timer, a question palette for review-later marking, and the ability to clear an option if you would rather skip a question than guess.",
  },
  {
    title: "Review, rank and repeat",
    body: "Study the solution for every question, read your subject-wise breakdown, check your rank, then compare the attempt against your earlier ones to see whether accuracy is actually improving.",
  },
];

const STATS = [
  { value: "10,000+", label: "Mock tests and practice papers" },
  { value: "4 tracks", label: "NEET, JEE, TNC nursing and class-wise" },
  { value: "Live", label: "Rank and percentile after every submit" },
  { value: "Free", label: "Solutions, analytics and leaderboards" },
];

const FAQS = [
  {
    q: "Is Test Sagar free to use?",
    a: "Yes. Thousands of mock tests, their solutions, your analytics and the leaderboards are free on a normal account. Premium is optional and adds an ad-free experience along with unrestricted access to premium-marked test series.",
  },
  {
    q: "Who runs Test Sagar?",
    a: "Test Sagar is owned and operated by TRMS. Our terms, privacy policy and refund and shipping policy pages carry the full business details, and our contact page lists the support channels we answer on.",
  },
  {
    q: "How is my rank calculated?",
    a: "Rank and percentile are computed on our servers from every submitted attempt on that specific paper, using marks first and time taken as the tie-breaker, so a faster attempt with the same score ranks higher.",
  },
  {
    q: "Can I retake a test?",
    a: "Yes. You can reattempt a paper as often as you like, and the attempt comparison page charts your accuracy and rank across those attempts so you can see the trend over weeks rather than a single score.",
  },
  {
    q: "What happens to my data?",
    a: "We store the account details you give us and the attempts you make so we can show your history, analytics and rank. We do not sell your data. The privacy policy explains what is kept and how to ask us to remove it.",
  },
];

const ADVICE = [
  "Most students lose marks to pacing rather than to unknown topics. Sit a full-length paper in one uninterrupted block at the same time of day as your real exam slot, and resist checking a solution mid-paper — the value of a mock comes from reproducing the pressure, not from the score.",
  "When you review, separate your wrong answers into three buckets: concepts you had not learned, concepts you knew but misapplied, and questions you simply rushed. Only the first bucket needs fresh study; the second needs practice sets on that chapter, and the third is a timing problem you fix by attempting more papers under the clock.",
  "Negative marking changes the maths of guessing. If you can eliminate two of four options, an attempt is usually worth it; if you cannot eliminate any, skipping protects your score more than a blind guess. Test Sagar lets you clear a selected option so you can genuinely leave a question blank rather than gamble on it.",
  "Finally, use your attempt history. A single percentage tells you very little, but accuracy plotted across eight or ten attempts shows whether your revision is working — and that trend is what the analytics and comparison pages are built to show you.",
];

const delay = (i: number) => ({ animationDelay: `${i * 90}ms` });

const Landing = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="landing-aurora relative flex min-h-screen flex-col overflow-x-hidden">
      <Helmet>
        <title>Test Sagar — Free JEE, NEET & TNC Mock Tests + Rankings</title>
        <meta
          name="description"
          content="Free full-length JEE, NEET and TNC nursing mock tests with a live timer, explained solutions, subject-wise analytics, all-India rankings and downloadable result PDFs."
        />
        <link rel="canonical" href={`${SITE}/`} />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="aurora-grid-lines" />
      <NavigationHeader />

      <main className="container relative mx-auto max-w-6xl flex-1 px-4 py-10 sm:py-16">
        {/* Hero — bento: copy block + 3D scene */}
        <section className="grid items-center gap-8 lg:grid-cols-6">
          <div className="reveal lg:col-span-3" style={delay(0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Free mock tests · Instant solutions · Live rankings
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              <span className="aurora-text">Practise the real exam</span>
              <br />
              before you sit for it
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300/90 sm:text-lg">
              Test Sagar is a free online mock test platform for JEE, NEET and TNC nursing aspirants. Attempt
              full-length papers under real timing and negative marking, read a worked explanation for every question,
              then track how your accuracy and rank move attempt after attempt.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group border-0 bg-gradient-to-r from-cyan-400 to-violet-400 text-slate-950 hover:from-cyan-300 hover:to-violet-300"
              >
                <Link to="/auth">
                  Start a free mock test
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-cyan-300/30 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                <Link to="/tnc-tests">Browse TNC nursing test series</Link>
              </Button>
            </div>
          </div>

          <div className="reveal lg:col-span-3" style={delay(1)}>
            <Hero3D className="mx-auto h-[300px] w-full max-w-lg sm:h-[420px]" />
          </div>
        </section>

        {/* Stats bento strip */}
        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className="aurora-card reveal p-5" style={delay(i)}>
              <p className="font-display text-2xl font-bold text-cyan-200">{s.value}</p>
              <p className="mt-1 text-sm text-slate-300/80">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Features bento grid */}
        <section className="mt-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold sm:text-4xl">
            What you get in <span className="aurora-text">every attempt</span>
          </h2>
          <p className="mt-3 max-w-3xl text-slate-300/85">
            A mock test is only useful if it tells you what to fix. Each paper on Test Sagar ends with the same set of
            study tools, whether it is a free paper or a premium one.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map(({ icon: Icon, title, body, span }, i) => (
              <article key={title} className={`aurora-card reveal p-6 ${span}`} style={delay(i)}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-violet-400/25 text-cyan-200">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Exams covered */}
        <section className="mt-20" aria-labelledby="exams-heading">
          <h2 id="exams-heading" className="text-2xl font-bold sm:text-4xl">
            Exams and subjects <span className="aurora-text">we cover</span>
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {EXAMS.map((e, i) => (
              <article key={e.name} className="aurora-card reveal p-6" style={delay(i)}>
                <h3 className="text-lg font-semibold text-cyan-100">{e.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">{e.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-20" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl font-bold sm:text-4xl">
            How Test Sagar <span className="aurora-text">works</span>
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="aurora-card reveal p-6" style={delay(i)}>
                <span className="font-display text-3xl font-extrabold text-violet-300/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Study advice */}
        <section className="mt-20" aria-labelledby="advice-heading">
          <h2 id="advice-heading" className="text-2xl font-bold sm:text-4xl">
            Getting more out of <span className="aurora-text">mock tests</span>
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {ADVICE.map((p, i) => (
              <p key={i} className="aurora-card reveal p-6 text-sm leading-relaxed text-slate-300/85" style={delay(i)}>
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold sm:text-4xl">
            Frequently asked <span className="aurora-text">questions</span>
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {FAQS.map((f, i) => (
              <div key={f.q} className="aurora-card reveal p-6" style={delay(i)}>
                <h3 className="font-semibold text-cyan-100">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="aurora-card reveal mt-20 overflow-hidden p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Ready to see <span className="aurora-text">where you stand?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300/85">
            Create a free account, attempt your first full-length paper today, and get your rank, solutions and
            subject-wise report the moment you submit.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-7 border-0 bg-gradient-to-r from-cyan-400 to-violet-400 text-slate-950 hover:from-cyan-300 hover:to-violet-300"
          >
            <Link to="/auth">Create a free account</Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
