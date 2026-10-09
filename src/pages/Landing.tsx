import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import studyDesk from "@/assets/study_desk_landing.jpg";
import { ArrowUpRight, ArrowRight, BookOpen, HeartPulse, GraduationCap, Timer, ChartNoAxesCombined, Check, ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Where do I find the TNC nursing tests?", a: "Choose TNC Nursing below or use the TNC link in the navigation. The catalogue groups available papers by category, including Daily Dose. Sign in before starting a test." },
  { q: "Do I need to pay before taking a test?", a: "Creating an account is free. Access depends on the paper and your account: eligible new accounts can receive a three-day TNC trial. After that, the access screen offers free verification or Premium. Check the pricing page for current plans before purchasing." },
  { q: "How should I interpret my leaderboard rank?", a: "A leaderboard compares submitted attempts on Test Sagar. It is not an official examination rank or a prediction of selection. Compare papers of similar difficulty, and focus on your accuracy as well as your position." },
  { q: "Can I clear an answer or review a question later?", a: "Yes. The test screen supports clearing a selected answer and marking questions for review. Check the question palette before submitting so that skipped questions and review marks are intentional." },
  { q: "Is Test Sagar an official examination website?", a: "No. Test Sagar is an independent practice platform operated by TRMS, not an examination authority. Always use the official examination notice for the current syllabus, dates and marking rules." },
];
const TRACKS = [
  { title: "TNC Nursing", label: "NURSING PRACTICE", icon: HeartPulse, text: "Daily Dose and nursing test series. Find your paper, practise under the clock and review your attempt.", href: "/tnc-tests", action: "Browse TNC tests", emphasis: true },
  { title: "Institution Quizzes", label: "BY INSTITUTION", icon: BookOpen, text: "Explore available practice papers by institution, then choose a test series and subject.", href: "/institutions", action: "Explore institutions", emphasis: false },
  { title: "JEE, NEET & Classes", label: "SUBJECT PRACTICE", icon: GraduationCap, text: "Sign in to browse class and stream-based tests for your next practice session.", href: "/auth", action: "Find your practice test", emphasis: false },
];
const Landing = () => (
  <div className="study-landing flex min-h-screen flex-col bg-background text-foreground">
    <Helmet>
      <title>Test Sagar — Nursing, JEE & NEET Mock Test Practice</title>
      <meta name="description" content="Find TNC nursing tests, institution quizzes and class-based practice on Test Sagar. Read practical mock-test revision advice and review your progress." />
      <link rel="canonical" href="https://tncnursing.site/" />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>
    </Helmet>
    <NavigationHeader />
    <main className="flex-1">
      <section className="study-hero relative isolate overflow-hidden" aria-labelledby="landing-title">
        <img src={studyDesk} alt="An anatomy teaching model, notebook and clock on a study desk" width={1920} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
        <div className="study-hero-shade absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> A little practice. Real progress.</p>
          <h1 id="landing-title" className="text-5xl font-semibold leading-tight sm:text-7xl">Test Sagar<span className="text-secondary">.</span></h1>
          <p className="mt-5 max-w-lg text-2xl font-medium leading-snug sm:text-3xl">Your next chapter starts<br className="hidden sm:block" /> with a better attempt.</p>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">Nursing test series, institution quizzes and subject practice. Make time for a paper. Make sense of your mistakes.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-3 bg-secondary text-secondary-foreground hover:bg-secondary/90"><Link to="/tnc-tests">Explore TNC Nursing <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="study-hero-button"><a href="#practice">Choose your exam <ArrowUpRight className="ml-2 h-4 w-4" /></a></Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Free account · Access options shown before your test</p>
        </div>
      </section>
      <section id="practice" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16" aria-labelledby="practice-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary">Find your focus</p><h2 id="practice-title" className="text-2xl font-semibold sm:text-3xl">What are you preparing for?</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">Your test series, one clear place to start.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TRACKS.map(({ title, label, icon: Icon, text, href, action, emphasis }) => (
            <article key={title} className={`flex flex-col rounded-lg border p-6 ${emphasis ? "border-secondary/40 bg-secondary/5" : "border-border bg-card"}`}>
              <div className="mb-8 flex items-center justify-between"><Icon className={`h-7 w-7 ${emphasis ? "text-secondary" : "text-primary"}`} /><span className="text-[10px] font-semibold tracking-widest text-muted-foreground">{label}</span></div>
              <h3 className="text-xl font-semibold">{title}</h3><p className="mb-6 mt-3 flex-1 text-sm leading-7 text-muted-foreground">{text}</p>
              <Button asChild variant="ghost" className="justify-between px-0 text-foreground hover:bg-transparent hover:text-secondary"><Link to={href}>{action}<ArrowUpRight className="h-4 w-4" /></Link></Button>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-muted/40" aria-labelledby="routine-title">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Build a study rhythm</p><h2 id="routine-title" className="text-2xl font-semibold leading-snug sm:text-3xl">A score is a starting point.<br />The review is where you grow.</h2><p className="mt-5 text-sm leading-7 text-muted-foreground">Use each attempt to decide what to study next, not just to collect another percentage.</p><Button asChild variant="link" className="mt-4 px-0"><a href="#revision">Read the revision notes <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[{ icon: Timer, title: "01 / Attempt", text: "Read the paper's marking rules, set aside its full duration and work without checking notes." }, { icon: BookOpen, title: "02 / Understand", text: "Review incorrect and skipped answers. Write down the concept or decision behind each mistake." }, { icon: ChartNoAxesCombined, title: "03 / Improve", text: "Revise one weak topic, then compare your next attempt on a similar paper." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon className="mb-5 h-6 w-6 text-secondary" /><h3 className="text-sm font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></div>)}
          </div>
        </div>
      </section>
      <section id="revision" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="revision-title">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">The revision notebook</p>
        <h2 id="revision-title" className="text-2xl font-semibold sm:text-3xl">Make your next mock test count.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Practical study notes from Test Sagar. These are preparation strategies, not official exam instructions or clinical guidance.</p>
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <article className="border-t-2 border-secondary pt-6"><span className="text-xs text-muted-foreground">01 / BEFORE THE PAPER</span><h3 className="mt-3 text-xl font-semibold">Plan your time before the timer starts</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">Start with the duration and question count shown for that paper. Reserve a short review window, then divide the remaining time by the number of questions. This is a pacing checkpoint, not a strict limit: some questions take seconds and others need a calculation.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">If one problem is using several questions' worth of time, mark it for review and move on. At your checkpoint, compare questions remaining with minutes remaining. Practise this habit on mocks rather than changing your entire approach on exam day.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">For example, a 60-minute practice paper with 50 questions and a 10-minute review window leaves an average of one minute per question. Use the actual paper's rules, not this example, for your attempt.</p></article>
          <article className="border-t-2 border-primary pt-6"><span className="text-xs text-muted-foreground">02 / AFTER SUBMISSION</span><h3 className="mt-3 text-xl font-semibold">Turn wrong answers into a revision plan</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">Create three headings in your notebook: concept gap, application error and reading error. A fact you could not recall belongs in the first group. Knowing the formula but choosing the wrong values belongs in the second. Missing a word such as “except” belongs in the third.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">For a concept gap, revisit your textbook and write a short explanation in your own words. For an application error, solve a few related questions without a timer first. For a reading error, note the exact word or unit you missed and slow down at that point in the next paper.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">Review skipped questions too. A correct guess is not proof of understanding: flag it for another look. Reattempt the topic after a break so that you test recall rather than memory of the option's position.</p></article>
          <article className="border-t-2 border-accent pt-6"><span className="text-xs text-muted-foreground">03 / NURSING REVISION</span><h3 className="mt-3 text-xl font-semibold">Connect nursing facts to their context</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">For a nursing topic, organise revision around assessment, the underlying principle and the reason an answer fits the question. When reviewing an anatomy question, connect the structure with its function instead of memorising the option alone.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">For community health or nursing fundamentals, make a comparison table for similar terms. Include the defining feature and the detail that distinguishes each one. Check explanations against your prescribed textbook and the official syllabus, especially when recommendations or terminology may have changed.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">Choose your next Daily Dose paper based on the topics you need to revisit. Practice questions support exam study; they are not instructions for treating a patient. Clinical decisions require current protocols and qualified supervision.</p></article>
        </div>
      </section>
      <section className="border-t border-border bg-muted/30" aria-labelledby="faq-title">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
          <div><h2 id="faq-title" className="text-2xl font-semibold sm:text-3xl">Before you begin.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">A few things worth knowing about your practice.</p><Button asChild variant="link" className="mt-3 px-0"><Link to="/contact">Need a hand? Contact support <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div>
          <div>{FAQS.map(({ q, a }) => <details key={q} className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">{q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-4 text-sm leading-7 text-muted-foreground">{a}</p></details>)}</div>
        </div>
      </section>
      <section className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-12 sm:px-8"><div><h2 className="text-2xl font-semibold">One paper. One step forward.</h2><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-secondary" /> Choose a test that fits today's goal.</p></div><Button asChild size="lg"><Link to="/tnc-tests">Find a nursing test <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></section>
    </main>
    <Footer />
  </div>
);
export default Landing;
