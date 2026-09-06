import { Helmet } from "react-helmet-async";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import FloatingBackground from "@/components/FloatingBackground";

const SITE = "https://test.shashanksv.com";

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Helmet>
        <title>Disclaimer — Test Sagar</title>
        <meta
          name="description"
          content="Disclaimer for Test Sagar: information accuracy, no affiliation with exam conducting bodies, advertising disclosure, and limits of liability."
        />
        <link rel="canonical" href={`${SITE}/disclaimer`} />
      </Helmet>

      <FloatingBackground />
      <NavigationHeader />

      <main className="container mx-auto px-4 py-10 sm:py-14 max-w-4xl flex-1 relative z-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">Disclaimer</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">General information</h2>
            <p>
              All content on Test Sagar (https://test.shashanksv.com), operated by TRMS, is provided for
              educational and practice purposes only. While we work hard to keep questions, solutions and exam
              patterns accurate and up to date, we make no warranties about the completeness, reliability or
              accuracy of this information. Any action you take based on the content of this site is strictly at
              your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">No affiliation with exam bodies</h2>
            <p>
              Test Sagar is an independent practice platform. We are not affiliated with, endorsed by, or
              officially connected to the National Testing Agency (NTA), the National Board of Examinations, any
              nursing council or recruitment board, or any other exam-conducting authority. NEET, JEE and other
              exam names are used only to describe the exams our practice material prepares students for. Always
              refer to the official websites of the respective exam authorities for official syllabi, patterns,
              dates and notifications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Practice results are indicative</h2>
            <p>
              Scores, ranks, percentiles and analytics shown on Test Sagar reflect performance on our mock tests
              only. They are a study aid and do not guarantee any result in the actual examination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Advertising</h2>
            <p>
              This site displays advertisements served by third-party networks, including Google AdSense, to keep
              the core practice library free. Advertisers may use cookies to serve ads based on your visits to
              this and other websites. You can learn more and manage personalised advertising in our{" "}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">External links</h2>
            <p>
              Test Sagar may link to external websites. We do not control and are not responsible for the content
              or privacy practices of those sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
            <p>
              If you have questions about this disclaimer, reach us through our{" "}
              <a href="/contact" className="text-primary hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Disclaimer;
