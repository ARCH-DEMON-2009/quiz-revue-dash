import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, FileText, ChevronRight, Loader2, AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import NavigationHeader from "@/components/NavigationHeader";
import Footer from "@/components/Footer";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { toast } from "sonner";


interface Batch {
  id: string;
  name: string;
  thumbnail?: string;
  price?: string;
  description?: string;
}

interface Subject {
  id: string;
  name: string;
  logo?: string;
  isPaid?: boolean;
}

interface Topic {
  id: string;
  name: string;
  logo?: string;
}

interface Content {
  id: string;
  title: string;
  material_type: "VIDEO" | "PDF" | string;
  thumbnail?: string;
  duration?: string;
  pdf_link?: string;
}

const RwaStudy = () => {
  const [view, setView] = useState<"batches" | "subjects" | "topics" | "content">("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!premiumLoading && !isPremium) {
      toast.error("Study Vault is a premium feature.");
      navigate("/pricing");
    }
  }, [isPremium, premiumLoading, navigate]);


  const callApi = async (action: string, params: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const { data, error } = await supabase.functions.invoke("rwa-study", {
        method: "GET",
        headers: { "x-query": query } // Note: we need to handle query params correctly in the function
      });
      
      // Since supabase.functions.invoke doesn't handle GET query params natively in the URL well, 
      // let's use a workaround or fix the function to read from a header or just use fetch.
      // For now, let's use fetch directly for simplicity if invoke fails to pass params.
      
      const session = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rwa-study?${query}`, {
        headers: {
          "Authorization": `Bearer ${session.data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
        }
      });
      
      const result = await response.json();
      if (!result.ok) throw new Error(result.error?.message || "API Error");
      return result.data;
    } catch (err: any) {
      console.error("API Call failed", err);
      toast.error(err.message || "Failed to fetch data");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    const data = await callApi("batches");
    if (data) {
      // Mocking decryption result until keys are added
      if (data.vaultData) {
        toast.info("Decryption keys missing. Showing raw data.");
      }
      setBatches(Array.isArray(data) ? data : []);
    }
  };

  const loadSubjects = async (batchId: string) => {
    const data = await callApi("subjects", { courseId: batchId });
    if (data?.data) {
      setSubjects(data.data.map((s: any) => ({
        id: s.subjectid || s.id,
        name: s.subject_name || s.name,
        logo: s.subject_logo || s.image,
        isPaid: s.is_paid === "1"
      })));
      setView("subjects");
      setSelectedBatch(batchId);
    }
  };

  const loadTopics = async (subjectId: string) => {
    if (!selectedBatch) return;
    const data = await callApi("topics", { courseId: selectedBatch, subjectId });
    if (data?.data) {
      setTopics(data.data.map((t: any) => ({
        id: t.topicid || t.id,
        name: t.topic_name || t.name,
        logo: t.topic_logo || t.image
      })));
      setView("topics");
      setSelectedSubject(subjectId);
    }
  };

  const loadContent = async (topicId: string) => {
    if (!selectedBatch || !selectedSubject) return;
    const data = await callApi("content", { 
      courseId: selectedBatch, 
      subjectId: selectedSubject,
      topicId 
    });
    if (data?.data) {
      setContents(data.data);
      setView("content");
      setSelectedTopic(topicId);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading study data...</p>
        </div>
      );
    }

    switch (view) {
      case "batches":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.length > 0 ? batches.map((batch) => (
              <Card key={batch.id} className="overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={() => loadSubjects(batch.id)}>
                <div className="aspect-video relative bg-muted">
                  {batch.thumbnail ? (
                    <img src={batch.thumbnail} alt={batch.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg line-clamp-1">{batch.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{batch.description || "No description available"}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-center">
                  <Badge variant="secondary">{batch.price ? `₹${batch.price}` : "Free"}</Badge>
                  <Button size="sm" variant="ghost">View Details <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-20">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No batches available</h3>
                <p className="text-muted-foreground">The upstream service returned no data or requires authentication.</p>
                <Button variant="outline" className="mt-4" onClick={loadBatches}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
              </div>
            )}
          </div>
        );

      case "subjects":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.id} className="hover:border-primary transition-colors cursor-pointer text-center p-4" onClick={() => loadTopics(subject.id)}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {subject.logo ? <img src={subject.logo} alt={subject.name} className="w-full h-full object-cover" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="font-medium text-sm line-clamp-2">{subject.name}</h3>
                {subject.isPaid && <Badge variant="outline" className="mt-2 text-[10px]">Premium</Badge>}
              </Card>
            ))}
          </div>
        );

      case "topics":
        return (
          <div className="space-y-3">
            {topics.map((topic) => (
              <Card key={topic.id} className="hover:bg-accent transition-colors cursor-pointer" onClick={() => loadContent(topic.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{topic.name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "content":
        return (
          <div className="space-y-4">
            <div className="flex gap-2 mb-6">
              <Button variant="outline" size="sm" className="rounded-full">All</Button>
              <Button variant="ghost" size="sm" className="rounded-full">Videos</Button>
              <Button variant="ghost" size="sm" className="rounded-full">Notes</Button>
            </div>
            {contents.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0 flex">
                  <div className="w-32 sm:w-48 aspect-video bg-muted relative shrink-0">
                    {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      {item.material_type === "VIDEO" ? <Play className="h-8 w-8 text-white" /> : <FileText className="h-8 w-8 text-white" />}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base line-clamp-1">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{item.material_type}</Badge>
                        {item.duration && <span className="text-[10px] text-muted-foreground">{Math.floor(parseInt(item.duration)/60)} min</span>}
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button size="sm" variant={item.material_type === "VIDEO" ? "default" : "secondary"}>
                        {item.material_type === "VIDEO" ? "Watch Now" : "View PDF"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }
  };

  const breadcrumbs = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap pb-2">
        <button onClick={() => setView("batches")} className="hover:text-primary transition-colors">Vault</button>
        {selectedBatch && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <button onClick={() => setView("subjects")} className="hover:text-primary transition-colors">Subjects</button>
          </>
        )}
        {selectedSubject && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <button onClick={() => setView("topics")} className="hover:text-primary transition-colors">Topics</button>
          </>
        )}
        {selectedTopic && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground">Content</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader showFullNav />
      <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">Study Vault</h1>
          <p className="text-muted-foreground">Access live batches, lectures and notes from the RWA portal.</p>
        </div>

        {breadcrumbs()}

        <div className="min-h-[400px]">
          {renderContent()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RwaStudy;
