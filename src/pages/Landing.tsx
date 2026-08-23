import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import FloatingBackground from "@/components/FloatingBackground";
import { BookOpen, Timer, BarChart3, Trophy, FileDown, ShieldCheck } from "lucide-react";

const SITE = "https://test.shashanksv.com";

const FEATURES = [
  {
    icon: Timer,
    title: "Real exam timing",
    body: "Every mock test runs on a live countdown with the same per-question pacing you get in the actual exam hall, so you learn to manage time before it costs you marks.",
  },
  {
    icon: BookOpen,
    title: "Explained solutions",
    body: "After you submit, each question opens with the correct option and a written explanation, so a wrong answer becomes a revision note instead of a mystery.",
  },
  {
    icon: BarChart3,
    title: "Subject-wise analytics",
    body: "Accuracy, attempt rate and time spent are broken down per subject and per attempt, so you can see whether Physics numericals or Nursing fundamentals need the next study hour.",
  },
  {
    icon: Trophy,
    title: "All-India rankings",
    body: "Each test has a leaderboard with rank and percentile against everyone who attempted it, plus a global leaderboard across the whole test series.",
  },
  {
    icon: FileDown,
    title: "Downloadable result PDFs",
    body: "Take your full paper, your answers and the solutions offline as a formatted PDF report you can print or revise from without opening the site.",
  },
  {
    icon: ShieldCheck,
    title: "Fair, secure attempts",
    body: "Answer keys never reach the browser during an attempt and scoring is validated on our servers, which keeps every leaderboard rank honest.",
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
    title: "1. Create a free account",
    body: "Sign up with an email address. Free accounts get thousands of mock tests, solutions, analytics and leaderboard access without any payment.",
  },
  {
    title: "2. Pick your exam and stream",
    body: "Choose your class or exam track, then pick a paper. Each listing shows the question count, total marks, negative marking and duration up front.",
  },
  {
    title: "3. Attempt it like the real thing",
    body: "Work through the paper with the live timer, a question palette for review-later marking, and the ability to clear an option if you would rather skip a question than guess.",
  },
  {
    title: "4. Review, rank and repeat",
    body: "Study the solution for every question, read your subject-wise breakdown, check your rank, then compare the attempt against your earlier ones to see whether accuracy is actually improving.",
  },
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
    <div className="min-h-screen bg-background relative flex flex-col">
      <Helmet>
        <title>Test Sagar — Free JEE, NEET & TNC Mock Tests + Rankings</title>
        <meta
          name="description"
          content="Free full-length JEE, NEET and TNC nursing mock tests with a live timer, explained solutions, subject-wise analytics, all-India rankings and downloadable result PDFs."
        />
        <link rel="canonical" href={`${SITE}/`} />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <FloatingBackground />
      <NavigationHeader />

      <main className="container mx-auto max-w-6xl flex-1 px-4 py-10 sm:py-14">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">Free mock tests · Instant solutions · Live rankings</Badge>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            <span className="text-gradient">Practise the real exam</span> before you sit for it
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Test Sagar is a free online mock test platform for JEE, NEET and TNC nursing aspirants. Attempt full-length
            papers under real timing and negative marking, read a worked explanation for every question, then track how
            your accuracy and rank move attempt after attempt.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start a free mock test</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/tnc-tests">Browse TNC nursing test series</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mt-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold sm:text-3xl">
            What you get in every attempt
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            A mock test is only useful if it tells you what to fix. Each paper on Test Sagar ends with the same set of
            study tools, whether it is a free paper or a premium one.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Exams covered */}
        <section className="mt-16" aria-labelledby="exams-heading">
          <h2 id="exams-heading" className="text-2xl font-bold sm:text-3xl">
            Exams and subjects we cover
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {EXAMS.map((e) => (
              <Card key={e.name} className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{e.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{e.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl font-bold sm:text-3xl">
            How Test Sagar works
          </h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.title} className="rounded-lg border bg-card/70 p-5">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Study advice */}
        <section className="mt-16" aria-labelledby="advice-heading">
          <h2 id="advice-heading" className="text-2xl font-bold sm:text-3xl">
            Getting more out of mock tests
          </h2>
          <div className="mt-4 space-y-4 text-muted-foreground">
            <p>
              Most students lose marks to pacing rather than to unknown topics. Sit a full-length paper in one
              uninterrupted block at the same time of day as your real exam slot, and resist checking a solution
              mid-paper — the value of a mock comes from reproducing the pressure, not from the score.
            </p>
            <p>
              When you review, separate your wrong answers into three buckets: concepts you had not learned, concepts
              you knew but misapplied, and questions you simply rushed. Only the first bucket needs fresh study; the
              second needs practice sets on that chapter, and the third is a timing problem you fix by attempting more
              papers under the clock.
            </p>
            <p>
              Negative marking changes the maths of guessing. If you can eliminate two of four options, an attempt is
              usually worth it; if you cannot eliminate any, skipping protects your score more than a blind guess.
              Test Sagar lets you clear a selected option so you can genuinely leave a question blank rather than
              gamble on it.
            </p>
            <p>
              Finally, use your attempt history. A single percentage tells you very little, but accuracy plotted across
              eight or ten attempts shows whether your revision is working — and that trend is what the analytics and
              comparison pages are built to show you.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-xl border bg-card/70 p-6 text-center sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to see where you stand?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Create a free account, attempt your first full-length paper today, and get your rank, solutions and
            subject-wise report the moment you submit.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/auth">Create a free account</Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
