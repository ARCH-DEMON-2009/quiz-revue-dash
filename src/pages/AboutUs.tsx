import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import FloatingBackground from "@/components/FloatingBackground";
import { Target, BookOpenCheck, Users, LineChart } from "lucide-react";

const SITE = "https://test.shashanksv.com";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Helmet>
        <title>About Us — Test Sagar | Free JEE, NEET & TNC Mock Tests</title>
        <meta
          name="description"
          content="Learn about Test Sagar, the free mock-test platform by TRMS for JEE, NEET and TNC nursing aspirants — our mission, how our tests are built, and why thousands of students practise with us."
        />
        <link rel="canonical" href={`${SITE}/about`} />
        <meta property="og:title" content="About Us — Test Sagar" />
        <meta
          property="og:description"
          content="The story and mission behind Test Sagar, the free mock-test platform for JEE, NEET and TNC nursing aspirants."
        />
        <meta property="og:url" content={`${SITE}/about`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Test Sagar",
            url: `${SITE}/about`,
            mainEntity: {
              "@type": "EducationalOrganization",
              name: "Test Sagar",
              parentOrganization: { "@type": "Organization", name: "TRMS" },
              url: SITE,
            },
          })}
        </script>
      </Helmet>

      <FloatingBackground />
      <NavigationHeader />

      <main className="container mx-auto px-4 py-10 sm:py-14 max-w-4xl flex-1 relative z-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            About <span className="text-gradient">Test Sagar</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test Sagar is a free online mock-test platform built and operated by TRMS, created to give every
            student in India access to honest, exam-accurate practice — regardless of their budget.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Our mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Coaching institutes and paid test series put quality practice behind a paywall. A student in a
                small town preparing for NEET, JEE or a nursing recruitment exam often has no way to know where
                they actually stand against real competition. Test Sagar exists to close that gap.
              </p>
              <p>
                We publish full-length and chapter-wise mock tests that mirror the real exam — the same number of
                questions, the same marking scheme with negative marking, and the same time pressure. After every
                attempt, students get written solutions, subject-wise analytics and an all-India rank, so practice
                turns into measurable improvement instead of guesswork.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                How our tests are built
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Every paper on Test Sagar is assembled to follow the official exam pattern: NEET papers distribute
                180 questions across Physics, Chemistry, Botany and Zoology; JEE sets mix objective and
                numerical-answer formats; our TNC nursing series covers anatomy, physiology, medical-surgical
                nursing, community health, midwifery and nursing foundations.
              </p>
              <p>
                Scoring is validated on our servers — answer keys never reach the browser during an attempt — so
                every leaderboard rank reflects genuine performance. Each attempt can be downloaded as a formatted
                PDF report with the questions, your answers and the solutions, for offline revision.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Who we serve
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                <p>
                  NEET and JEE aspirants, nursing students preparing for TNC and other recruitment exams, and
                  school students strengthening their fundamentals with class-wise practice sets. Free accounts
                  include thousands of mock tests, solutions, analytics and leaderboard access — no payment
                  required.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  What makes us different
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                <p>
                  We focus on honest measurement: real exam timing, per-question review with explanations,
                  subject-wise accuracy tracking across attempts, and rank and percentile against everyone who
                  took the same paper. Premium plans remove ads and add convenience features, but the core
                  practice library stays free.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center pt-4">
            <p className="text-muted-foreground mb-4">
              Questions or feedback? We would love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Take a Free Mock Test</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
