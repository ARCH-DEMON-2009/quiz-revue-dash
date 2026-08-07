const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-3xl text-center">
        <h1 className="mb-6 text-4xl font-bold">SEO & Performance Roadmap</h1>
        <div className="space-y-6 text-left text-lg text-muted-foreground">
          <section>
            <h2 className="mb-2 font-semibold text-foreground">1. Performance & Monitoring</h2>
            <p>Set up production performance monitoring (Core Web Vitals) and alerts so I can keep load times fast and smooth over time.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">2. Rich Search Results</h2>
            <p>Add FAQ sections with FAQ structured data for the main quiz, dashboard, and leaderboard pages to improve rich results.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">3. Canonicalization</h2>
            <p>Add canonical URL handling and redirect rules so every route consistently resolves to a single indexable URL.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">4. Keyword-Specific Landing Pages</h2>
            <p>Create dedicated landing pages for “TNC test series” and other top queries so I can rank higher for each keyword cluster.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">5. Google Search Console</h2>
            <p>Connect Google Search Console and verify indexing so I can track impressions and fix crawl errors.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Index;
