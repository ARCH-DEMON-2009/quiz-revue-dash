import { CheckCircle2, AlertTriangle, Search, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">SEO & Performance Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Tracking implementation of search engine optimization and platform performance enhancements.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Performance Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm">Implement pre-rendering or SSR for quiz, dashboard, and leaderboard routes for consistent crawling.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm">Add automated performance budgets and alerts for bundle size and Core Web Vitals.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Search Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm">Build an SEO meta preview tool for instant verification of title, meta, canonical, and OG tags.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm">Generate dedicated landing pages for top keyword clusters like "TNC test series".</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Audit Review Status</h2>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ready to rescan</Badge>
          </div>
          
          <div className="space-y-4">
            {[
              { 
                title: "Headings and buttons need better structure", 
                desc: "Multiple pages had duplicate H1s or generic titles. Profile button accessibility fixed.",
                status: "Fix applied" 
              },
              { 
                title: "Titles and descriptions are duplicated or too long", 
                desc: "Route-specific overrides implemented for /pricing, /leaderboard, and TNC pages.",
                status: "Fix applied" 
              },
              { 
                title: "Social previews are duplicated across pages", 
                desc: "Dynamic OG tags and URL attribution fixed for sub-pages.",
                status: "Fix applied" 
              },
              { 
                title: "Crawler rules need attention", 
                desc: "robots.txt now correctly references the sitemap.",
                status: "Fix applied" 
              },
              { 
                title: "Sitemap needs attention", 
                desc: "Absolute loc entries and missing routes like /quiz and /results added.",
                status: "Fix applied" 
              },
              { 
                title: "AI summary is missing", 
                desc: "llms.txt implemented to help AI assistants understand the platform.",
                status: "Fix applied" 
              }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">{item.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
