import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/components/AuthContext";
import UploadZone from "@/components/UploadZone";
import ScoreCard from "@/components/ScoreCard";
import KeywordChart from "@/components/KeywordChart";
import SuggestionPanel from "@/components/SuggestionPanel";

interface AnalyzeResult {
  match_score: number;
  justification: string;
  section_scores: { skills: number; experience: number; education: number };
  matched_keywords: string[];
  missing_keywords: string[];
  ats_flags: string[];
  cache_hit: boolean;
  processing_time_ms: number;
}

interface Suggestion {
  section: string;
  original: string | null;
  suggested: string;
  reason: string;
}

function safeDetail(e: any, fallback: string): string {
  const detail = e?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? String(d)).join(" · ");
  if (typeof detail === "string") return detail;
  return fallback;
}

export default function App() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [suggestions, setSuggestions] = useState<{ edits: Suggestion[]; keywords_to_add: string[]; summary_rewrite?: string | null }>({ edits: [], keywords_to_add: [] });
  const [analyzing, setAnalyzing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"score" | "keywords" | "suggestions">("score");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  async function handleAnalyze() {
    if (!jdText.trim()) return setError("Please paste a job description.");
    if (!resumeText && !resumeFile) return setError("Please upload or paste your resume.");
    setError(null);
    setResult(null);
    setSuggestions({ edits: [], keywords_to_add: [] });
    setAnalyzing(true);
    try {
      let res;
      if (resumeFile) {
        const fd = new FormData();
        fd.append("resume_file", resumeFile);
        fd.append("jd_text", jdText);
        // Do NOT set Content-Type manually — axios sets it with the correct boundary
        res = await axios.post("/api/analyze/upload", fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post("/api/analyze", { resume_text: resumeText, jd_text: jdText }, { headers: authHeaders });
      }
      setResult(res.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      setError(safeDetail(e, "Analysis failed. Please try again."));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSuggest() {
    if (!result || !resumeText || !jdText) return;
    setSuggesting(true);
    try {
      const res = await axios.post(
        "/api/suggest",
        { resume_text: resumeText, jd_text: jdText, missing_keywords: result.missing_keywords },
        { headers: authHeaders }
      );
      setSuggestions({
        edits: res.data.edits || [],
        keywords_to_add: res.data.keywords_to_add || [],
        summary_rewrite: res.data.summary_rewrite,
      });
      setActiveTab("suggestions");
    } catch (e: any) {
      setError(safeDetail(e, "Could not fetch suggestions."));
    } finally {
      setSuggesting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Dashboard · ResumeMatch AI</title></Head>
      <div className="min-h-screen bg-[rgb(15,15,25)] text-slate-100">

        {/* Nav */}
        <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-3 glass border-b border-white/5">
          <span className="font-bold gradient-text text-base">ResumeMatch AI</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              👋 {user.name}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-950/30"
            >
              Sign out
            </button>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
              Analyse your <span className="gradient-text">resume match</span>
            </h1>
            <p className="text-slate-400 text-sm">Upload your resume and paste a JD to get your AI-powered score.</p>
          </div>

          {/* Input */}
          <div className="glass rounded-2xl p-6 mb-6">
            <UploadZone
              resumeText={resumeText}
              jdText={jdText}
              onResumeText={(t, _fn, f) => { setResumeText(t); setResumeFile(f ?? null); }}
              onJdText={setJdText}
            />

            {error && (
              <p className="mt-4 text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2 glow-indigo"
            >
              {analyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analysing…
                </>
              ) : "Analyse Match →"}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div ref={resultRef} className="fade-up">
              {/* Tab bar */}
              <div className="flex gap-2 mb-4">
                {(["score", "keywords", "suggestions"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                      activeTab === t
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={handleSuggest}
                  disabled={suggesting}
                  className="ml-auto text-xs px-4 py-2 rounded-xl bg-purple-700/40 hover:bg-purple-600/50 text-purple-300 font-semibold transition-all flex items-center gap-1.5"
                >
                  {suggesting ? (
                    <span className="w-3 h-3 border border-purple-400/40 border-t-purple-300 rounded-full animate-spin" />
                  ) : "✨"}
                  Get suggestions
                </button>
              </div>

              {activeTab === "score" && (
                <ScoreCard
                  score={result.match_score}
                  justification={result.justification}
                  sectionScores={result.section_scores}
                  atsFlags={result.ats_flags}
                  cacheHit={result.cache_hit}
                  processingTimeMs={result.processing_time_ms}
                />
              )}
              {activeTab === "keywords" && (
                <KeywordChart
                  matched={result.matched_keywords}
                  missing={result.missing_keywords}
                  onMissingClick={() => { handleSuggest(); }}
                />
              )}
              {activeTab === "suggestions" && (
                suggestions.edits.length > 0 || suggestions.summary_rewrite
                  ? <SuggestionPanel
                      edits={suggestions.edits}
                      keywordsToAdd={suggestions.keywords_to_add}
                      summaryRewrite={suggestions.summary_rewrite}
                      loading={suggesting}
                    />
                  : <div className="glass rounded-2xl p-10 text-center text-slate-500 text-sm">
                      {suggesting
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" /> Generating suggestions…</span>
                        : 'Click "Get suggestions" above to generate AI-powered rewrites.'}
                    </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
