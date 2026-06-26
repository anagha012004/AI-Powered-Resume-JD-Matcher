import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/components/AuthContext";
import JDMatch from "@/components/JDMatch";
import CoverLetter from "@/components/CoverLetter";
import ResumeBuilder from "@/components/ResumeBuilder";

type Depth = "light" | "keywords" | "full";
type WorkflowTab = "tailor" | "match" | "builder" | "materials";

const DEPTH_OPTIONS: { id: Depth; label: string; desc: string; icon: string }[] = [
  { id: "light",    label: "Light Nudge",      icon: "🪶", desc: "Fix 2-3 bullets for missing keywords" },
  { id: "keywords", label: "Keyword Enhance",  icon: "🔑", desc: "Weave JD keywords throughout content" },
  { id: "full",     label: "Full Tailor",       icon: "✨", desc: "Rewrite summary, reorder, mirror JD language" },
];

interface TailorResult {
  tailored_resume: string;
  changes_summary: string[];
  jd_match: {
    match_percentage: number;
    highlighted_keywords: { keyword: string; found: boolean }[];
    covered_requirements: string[];
    missing_requirements: string[];
  };
}

function safeDetail(e: any, fallback: string): string {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x: any) => x.msg ?? String(x)).join(" · ");
  return typeof d === "string" ? d : fallback;
}

export default function BuilderPage() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [masterResume, setMasterResume] = useState("");
  const [jdText, setJdText]             = useState("");
  const [depth, setDepth]               = useState<Depth>("keywords");
  const [tailoring, setTailoring]       = useState(false);
  const [tailorError, setTailorError]   = useState<string | null>(null);
  const [tailorRetryIn, setTailorRetryIn] = useState<number | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [activeTab, setActiveTab]       = useState<WorkflowTab>("tailor");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  function startCountdown(set: React.Dispatch<React.SetStateAction<number | null>>, seconds: number) {
    set(seconds);
    const iv = setInterval(() => {
      set((p) => { if (p === null || p <= 1) { clearInterval(iv); return null; } return p - 1; });
    }, 1000);
  }

  async function handleTailor() {
    if (!masterResume.trim() || !jdText.trim()) {
      setTailorError("Paste your master resume and a job description first.");
      return;
    }
    setTailorError(null);
    setTailorRetryIn(null);
    setTailoring(true);
    try {
      const res = await axios.post(
        "/api/tailor",
        { master_resume: masterResume, jd_text: jdText, depth },
        { headers: authHeaders }
      );
      setTailorResult(res.data);
      setActiveTab("match");
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = safeDetail(e, "Tailoring failed. Please try again.");
      setTailorError(detail);
      if (status === 429) {
        const m = detail.match(/(\d+)s/);
        if (m) startCountdown(setTailorRetryIn, parseInt(m[1], 10));
      }
    } finally {
      setTailoring(false);
    }
  }

  if (loading || !user) return null;

  const TAB_LABELS: Record<WorkflowTab, string> = {
    tailor:    "1 · Input",
    match:     "2 · JD Match",
    builder:   "3 · Builder",
    materials: "4 · Cover Letter",
  };

  return (
    <>
      <Head><title>Resume Builder · ResumeMatch AI</title></Head>
      <div className="min-h-screen bg-[rgb(15,15,25)] text-slate-100">

        {/* Nav */}
        <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-3 glass border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/app")}
              className="text-slate-500 hover:text-white text-sm transition-colors">← Dashboard</button>
            <span className="text-white/20">|</span>
            <span className="font-bold gradient-text text-base">Resume Builder</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">👋 {user.name}</span>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-950/30">Sign out</button>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-8">

          {/* Workflow tabs */}
          <div className="flex gap-1 mb-6 bg-white/3 rounded-xl p-1 border border-white/5">
            {(Object.keys(TAB_LABELS) as WorkflowTab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                disabled={t !== "tailor" && !tailorResult && t !== "builder"}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === t
                    ? "bg-indigo-600 text-white shadow-lg"
                    : t !== "tailor" && !tailorResult && t !== "builder"
                    ? "text-slate-700 cursor-not-allowed"
                    : "text-slate-400 hover:text-white"
                }`}
              >{TAB_LABELS[t]}</button>
            ))}
          </div>

          {/* ── TAB 1: Input ── */}
          {activeTab === "tailor" && (
            <div className="flex flex-col gap-6 fade-up">
              <div>
                <h1 className="text-xl font-extrabold mb-1">
                  Upload your <span className="gradient-text">master resume</span>
                </h1>
                <p className="text-slate-400 text-sm">
                  Paste your full work history — every role, project, skill, and degree.
                  The AI will tailor a targeted version for each job.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Master resume */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Master Resume
                    <span className="ml-2 text-slate-600 font-normal normal-case">(paste full text)</span>
                  </label>
                  <textarea
                    value={masterResume}
                    onChange={(e) => setMasterResume(e.target.value)}
                    rows={20}
                    className="bg-[rgb(22,22,38)] border border-white/10 rounded-xl p-4 text-sm text-slate-100 font-mono
                      resize-none outline-none focus:border-indigo-500 leading-relaxed placeholder:text-slate-500"
                    placeholder={"Jane Smith\njane@example.com | linkedin.com/in/janesmith\n\nSummary:\nSenior Python engineer with 7 years building...\n\nExperience:\nStaff Engineer | Acme Corp | 2020 – Present\n- Led migration from monolith to microservices...\n- Reduced P99 latency by 45% via Redis caching...\n\nSkills:\nPython, FastAPI, PostgreSQL, Redis, Docker, Kubernetes, AWS, Terraform\n\nEducation:\nB.Sc. Computer Science | MIT | 2016"}
                  />
                  <p className="text-[10px] text-slate-600">{masterResume.length.toLocaleString()} chars</p>
                </div>

                {/* JD */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Job Description
                  </label>
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    rows={20}
                    className="bg-[rgb(22,22,38)] border border-white/10 rounded-xl p-4 text-sm text-slate-100 font-mono
                      resize-none outline-none focus:border-indigo-500 leading-relaxed placeholder:text-slate-500"
                    placeholder="Paste the full job description here…"
                  />
                  <p className="text-[10px] text-slate-600">{jdText.length.toLocaleString()} chars</p>
                </div>
              </div>

              {/* Depth selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3 block">
                  Tailoring Depth
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEPTH_OPTIONS.map((d) => (
                    <button key={d.id} onClick={() => setDepth(d.id)}
                      className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border transition-all text-left ${
                        depth === d.id
                          ? "border-indigo-500/60 bg-indigo-950/40 text-white"
                          : "border-white/8 glass text-slate-400 hover:border-indigo-500/30 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{d.icon}</span>
                      <span className="text-sm font-bold">{d.label}</span>
                      <span className="text-xs leading-snug opacity-70">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {tailorError && (
                <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3">
                  <span className="text-amber-400 flex-shrink-0 mt-0.5">{tailorRetryIn ? "⏳" : "⚠"}</span>
                  <div>
                    <p className="text-sm text-amber-300">{tailorError}</p>
                    {tailorRetryIn && (
                      <p className="text-xs text-amber-500 mt-1">
                        Retry in <span className="font-bold text-amber-300">{tailorRetryIn}s</span> — or click Generate again once ready.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleTailor} disabled={tailoring}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl
                  transition-all hover:scale-[1.01] flex items-center justify-center gap-2 glow-indigo text-sm"
              >
                {tailoring ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Tailoring resume…</>
                ) : `Generate Tailored Resume →`}
              </button>
            </div>
          )}

          {/* ── TAB 2: JD Match ── */}
          {activeTab === "match" && tailorResult && (
            <div className="flex flex-col gap-5 fade-up">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold mb-1">JD Match <span className="gradient-text">Comparison</span></h2>
                  <p className="text-slate-400 text-xs">Side-by-side view with highlighted keyword coverage.</p>
                </div>
                <button onClick={() => setActiveTab("builder")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0">
                  Open in Builder →
                </button>
              </div>

              {/* Changes summary */}
              {tailorResult.changes_summary.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-300 mb-2">Changes made</p>
                  <ul className="flex flex-col gap-1">
                    {tailorResult.changes_summary.map((c, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">→</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <JDMatch
                matchPercentage={tailorResult.jd_match.match_percentage}
                highlightedKeywords={tailorResult.jd_match.highlighted_keywords}
                coveredRequirements={tailorResult.jd_match.covered_requirements}
                missingRequirements={tailorResult.jd_match.missing_requirements}
                jdText={jdText}
                tailoredResume={tailorResult.tailored_resume}
              />
            </div>
          )}

          {/* ── TAB 3: Builder ── */}
          {activeTab === "builder" && (
            <div className="fade-up glass rounded-2xl overflow-hidden">
              <ResumeBuilder
                initialText={tailorResult?.tailored_resume ?? masterResume}
                token={token ?? ""}
              />
            </div>
          )}

          {/* ── TAB 4: Cover Letter & Outreach ── */}
          {activeTab === "materials" && (
            <div className="flex flex-col gap-5 fade-up">
              <div>
                <h2 className="text-xl font-extrabold mb-1">Application <span className="gradient-text">Materials</span></h2>
                <p className="text-slate-400 text-xs">
                  Cover letters and outreach messages generated from the same resume + JD context.
                </p>
              </div>
              {(tailorResult || masterResume) && jdText ? (
                <CoverLetter
                  resumeText={tailorResult?.tailored_resume ?? masterResume}
                  jdText={jdText}
                  token={token ?? ""}
                />
              ) : (
                <div className="glass rounded-2xl p-10 text-center text-slate-500 text-sm">
                  Complete the tailoring step first to generate application materials.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
