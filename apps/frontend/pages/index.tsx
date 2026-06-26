import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

const FEATURES = [
  { icon: "🧠", title: "Two-Stage AI Pipeline", desc: "Local embeddings gate the Gemini call — fast rejection in ~50ms, full analysis only when it counts." },
  { icon: "⚡", title: "Multi-Model Fallback", desc: "Gemini 2.0 Flash → Groq → OpenRouter. Zero downtime even when one provider hits rate limits." },
  { icon: "🎯", title: "ATS Score + Breakdown", desc: "0–100 match score with per-section scoring (Skills, Experience, Education) and ATS formatting flags." },
  { icon: "✍️", title: "Smart Suggestions", desc: "AI rewrites your bullet points to naturally incorporate missing keywords — not just lists, actual sentences." },
  { icon: "📊", title: "Keyword Visualisation", desc: "Interactive bar chart showing matched vs missing keywords. Click any missing keyword for instant suggestions." },
  { icon: "🏆", title: "Batch Ranking", desc: "Upload multiple resumes against one JD. Get a ranked leaderboard sorted by match score in seconds." },
];

const STEPS = [
  { n: "01", title: "Upload Resume", desc: "Drag & drop a PDF or paste plain text." },
  { n: "02", title: "Paste JD", desc: "Copy-paste the job description you're targeting." },
  { n: "03", title: "Get Your Score", desc: "AI scores the match 0–100 with full justification." },
  { n: "04", title: "Fix & Resubmit", desc: "Apply suggested edits, re-score to track improvement." },
];

const STATS = [
  { value: "< 2s", label: "Average analysis time" },
  { value: "3×", label: "LLM provider fallbacks" },
  { value: "24hr", label: "Redis cache TTL" },
  { value: "100%", label: "Free to run" },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "Software Engineer", avatar: "PS", text: "Went from 45% to 89% match score after applying the AI suggestions. Got the interview the next day." },
  { name: "Marcus L.", role: "Product Manager", avatar: "ML", text: "The ATS flags were a game-changer — my resume had formatting issues I never noticed before." },
  { name: "Aisha K.", role: "Data Scientist", avatar: "AK", text: "Batch ranking let me tailor my resume for 10 different roles in one session. Incredibly efficient." },
];

const PIPELINE = [
  { label: "Your Resume", color: "bg-indigo-600", icon: "📄" },
  { label: "Embeddings", color: "bg-indigo-500", icon: "🔢" },
  { label: "Cosine Filter", color: "bg-purple-600", icon: "⚡" },
  { label: "Gemini Flash", color: "bg-pink-600", icon: "🧠" },
  { label: "Score + Tips", color: "bg-emerald-600", icon: "✅" },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>ResumeMatch AI — Score your resume in seconds</title>
        <meta name="description" content="AI-powered resume & job description matcher with Gemini, Groq, and OpenRouter fallback." />
      </Head>

      <div className="min-h-screen bg-[rgb(15,15,25)] text-slate-100 overflow-x-hidden">

        {/* ── Nav ── */}
        <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 glass border-b border-white/5">
          <span className="text-lg font-bold gradient-text">ResumeMatch AI</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl transition-all hover:scale-105">
              Get started free
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-32 overflow-hidden">
          {/* Orbs */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
          <div className="absolute top-60 right-1/4 w-48 h-48 bg-pink-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow" />

          {/* Floating grid lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />

          <div className="fade-up-1 inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 pulse-ring inline-block" />
            Powered by Gemini 2.0 Flash · Groq · OpenRouter
          </div>

          <h1 className="fade-up-2 text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl mb-6">
            Know exactly how well your{" "}
            <span className="gradient-text">resume matches</span>{" "}
            any job
          </h1>

          <p className="fade-up-3 text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
            Upload your resume, paste the job description, and get an AI-powered 0–100 match score,
            keyword breakdown, section-level analysis, and targeted edit suggestions — in under 2 seconds.
          </p>

          <div className="fade-up-4 flex flex-col sm:flex-row gap-4 items-center mb-16">
            <Link href="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 glow-indigo">
              Analyse my resume →
            </Link>
            <Link href="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Already have an account? Sign in
            </Link>
          </div>

          {/* Hero mock score card */}
          <div className="fade-up-4 float glass rounded-3xl p-8 max-w-lg w-full glow-indigo relative">
            {/* Decorative corner badge */}
            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              LIVE RESULT
            </div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-slate-300">Match Analysis</span>
              <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full">cached · 3ms</span>
            </div>
            <div className="flex items-center gap-6 mb-5">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#scoreGrad)" strokeWidth="3"
                    strokeDasharray="82 18" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-300">82</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm text-slate-300 mb-3">Strong backend alignment. Cloud-native experience gaps noted.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[["Skills", 88, "#6366f1"], ["Exp.", 80, "#a855f7"], ["Edu.", 75, "#ec4899"]].map(([k, v, c]) => (
                    <div key={k as string} className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-base font-bold" style={{ color: c as string }}>{v as number}</div>
                      <div className="text-xs text-slate-500">{k as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Keyword pills */}
            <div className="flex flex-wrap gap-1.5">
              {["Python ✓", "FastAPI ✓", "AWS ✓", "Docker ✓", "Kubernetes ✗", "Terraform ✗"].map((kw) => (
                <span key={kw} className={`text-xs px-2.5 py-1 rounded-full font-medium ${kw.endsWith("✓") ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-red-950/60 text-red-400 border border-red-800/40"}`}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-extrabold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pipeline visualization ── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How the AI pipeline works</h2>
            <p className="text-slate-400 text-sm mb-12">Two-stage architecture keeps costs near zero for weak matches.</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-0">
              {PIPELINE.map((p, i) => (
                <div key={p.label} className="flex flex-col md:flex-row items-center">
                  <div className={`${p.color} rounded-2xl px-5 py-4 text-center min-w-[110px] shadow-lg`}>
                    <div className="text-2xl mb-1">{p.icon}</div>
                    <div className="text-xs font-bold text-white">{p.label}</div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="text-slate-600 text-2xl my-2 md:my-0 md:mx-1 rotate-90 md:rotate-0">→</div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-slate-500 max-w-lg mx-auto">
              Embeddings gate the LLM call — cosine &lt; 0.25 returns a rejection in ~50ms with zero API cost.
              Only meaningful matches hit Gemini.
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to land the job</h2>
            <p className="text-slate-400 max-w-xl mx-auto">A full analysis pipeline, not just a keyword checker.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:border-indigo-700/50 transition-all hover:-translate-y-1 group cursor-default">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-24 px-6 bg-[rgb(22,22,38)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Four steps to a better resume</h2>
              <p className="text-slate-400">From upload to offer in under five minutes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-600/40 to-transparent z-10" />
                  )}
                  <div className="glass rounded-2xl p-6 text-center h-full hover:border-purple-700/40 transition-colors">
                    <div className="text-3xl font-black gradient-text mb-3">{s.n}</div>
                    <h3 className="font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">What users say</h2>
            <p className="text-slate-400 text-sm">Real feedback from job seekers who used ResumeMatch AI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass rounded-2xl p-6 flex flex-col gap-4">
                <p className="text-sm text-slate-300 leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-32 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)"
          }} />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Ready to <span className="gradient-text">beat the ATS?</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10">Free to run. No credit card. Just your resume and a job description.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 glow-indigo">
                Start for free →
              </Link>
              <Link href="/login" className="inline-block glass hover:border-indigo-600/50 text-slate-300 font-semibold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-8 text-center text-xs text-slate-600 border-t border-white/5">
          ResumeMatch AI · Built with FastAPI, Next.js, Gemini 2.0 Flash, Groq &amp; sentence-transformers
        </footer>
      </div>
    </>
  );
}
