import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";

/* ── Data ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: "🧠", title: "Two-Stage AI Pipeline", color: "from-indigo-600/20 to-indigo-600/5", border: "hover:border-indigo-600/40", desc: "Local MiniLM embeddings gate the LLM call. Cosine < 0.25 → reject in ~50ms, zero API cost. Only meaningful matches hit Gemini." },
  { icon: "⚡", title: "Multi-Model Fallback", color: "from-amber-600/20 to-amber-600/5", border: "hover:border-amber-600/40", desc: "Gemini 2.0 Flash → Groq Llama 3.3 70B → OpenRouter. Automatic failover with zero downtime when any provider rate-limits." },
  { icon: "🎯", title: "Role-Level Verdict", color: "from-emerald-600/20 to-emerald-600/5", border: "hover:border-emerald-600/40", desc: "Not just a score — Perfect / Strong / Partial / Weak verdict with per-section scoring (Skills, Experience, Education)." },
  { icon: "✍️", title: "Targeted Rewrites", color: "from-purple-600/20 to-purple-600/5", border: "hover:border-purple-600/40", desc: "AI rewrites your bullet points to naturally incorporate missing keywords — not generic advice, actual sentences." },
  { icon: "📊", title: "Radar Gap Analysis", color: "from-pink-600/20 to-pink-600/5", border: "hover:border-pink-600/40", desc: "Interactive radar chart across Skills, Experience, Education, and Keywords. Click any missing keyword for instant rewrites." },
  { icon: "🏆", title: "Batch Ranking", color: "from-cyan-600/20 to-cyan-600/5", border: "hover:border-cyan-600/40", desc: "Upload multiple resumes against one JD. Get a ranked leaderboard sorted by match score — ideal for recruiters." },
];

const STEPS = [
  { n: "01", title: "Upload Resume", desc: "Drag & drop a PDF or paste plain text.", icon: "📄" },
  { n: "02", title: "Paste JD",      desc: "Copy the job description you're targeting.", icon: "📋" },
  { n: "03", title: "Get Scored",    desc: "AI pipeline scores the match 0–100.", icon: "🎯" },
  { n: "04", title: "Fix & Win",     desc: "Apply AI rewrites, re-score, track progress.", icon: "🚀" },
];

const STATS = [
  { value: "< 2s", label: "Analysis time" },
  { value: "3×",   label: "LLM fallbacks"  },
  { value: "24hr", label: "Cache TTL"      },
  { value: "0$",   label: "API cost on low matches" },
];

const PIPELINE = [
  { label: "Resume",         icon: "📄", color: "bg-slate-700",   desc: "PDF or text" },
  { label: "MiniLM Embed",   icon: "🔢", color: "bg-indigo-700",  desc: "384-dim vector" },
  { label: "Cosine Filter",  icon: "⚡", color: "bg-purple-700",  desc: "< 0.25 → reject" },
  { label: "Gemini Flash",   icon: "🧠", color: "bg-pink-700",    desc: "Structured JSON" },
  { label: "Score + Tips",   icon: "✅", color: "bg-emerald-700", desc: "0–100 + rewrites" },
];

/* ── Animated score counter ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let cur = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration, start]);
  return count;
}

/* ── Hero mock card ─────────────────────────────────────────────────────── */
function HeroCard() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const score = useCountUp(85, 1400, visible);
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div ref={ref} className="float glass rounded-3xl p-7 max-w-sm w-full glow-indigo relative">
      <div className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">LIVE DEMO</div>

      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-slate-300">Match Analysis</span>
        <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-700/30 px-2 py-0.5 rounded-full">⚡ 847ms</span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="3.2" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#sg)" strokeWidth="3.2"
              strokeDasharray={`${score * 0.82} ${100 - score * 0.82}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1.4s ease-out" }}
            />
            <defs>
              <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold" style={{ color }}>{score}</span>
            <span className="text-[9px] text-slate-500">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Strong Match
          </div>
          <div className="flex flex-col gap-1.5">
            {[["Skills", 88, "#6366f1"], ["Experience", 82, "#a855f7"], ["Education", 75, "#ec4899"]].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-16">{k}</span>
                <div className="flex-1 bg-white/5 rounded-full h-1.5">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: visible ? `${v}%` : "0%", backgroundColor: c as string }} />
                </div>
                <span className="text-[10px] font-bold w-5" style={{ color: c as string }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1">
        {["Python ✓", "FastAPI ✓", "AWS ✓", "SQL ✓", "Docker ✗", "K8s ✗"].map((kw) => (
          <span key={kw} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${kw.endsWith("✓") ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40" : "bg-red-950/50 text-red-400 border-red-800/40"}`}>
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && user) router.replace("/app"); }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>ResumeMatch AI — Beat the ATS with AI</title>
        <meta name="description" content="AI-powered resume & job description matcher. Score, analyse, and fix your resume in seconds." />
      </Head>

      <div className="min-h-screen bg-[rgb(15,15,25)] text-slate-100 overflow-x-hidden">

        {/* Nav */}
        <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 glass border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold">RM</div>
            <span className="text-base font-bold gradient-text">ResumeMatch AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl transition-all hover:scale-105 shadow-lg shadow-indigo-600/20">
              Get started free
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative flex flex-col lg:flex-row items-center justify-center gap-12 px-6 pt-40 pb-24 max-w-6xl mx-auto">
          {/* Background effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/8 rounded-full blur-[160px] pointer-events-none" />
          <div className="absolute top-32 left-1/4 w-72 h-72 bg-purple-600/8 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.035) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

          {/* Left copy */}
          <div className="flex-1 flex flex-col items-start text-left max-w-xl relative z-10">
            <div className="fade-up-1 inline-flex items-center gap-2 bg-indigo-950/70 border border-indigo-700/40 text-indigo-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-400 pulse-ring inline-block" />
              Gemini 2.0 Flash · Groq · OpenRouter fallback
            </div>

            <h1 className="fade-up-2 text-5xl md:text-6xl font-extrabold leading-[1.08] mb-6">
              Know exactly how well your{" "}
              <span className="gradient-text">resume matches</span>{" "}
              any job
            </h1>

            <p className="fade-up-3 text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
              AI-powered 0–100 match score, keyword radar, section-level scoring, ATS flags,
              and targeted rewrites — in under 2 seconds.
            </p>

            <div className="fade-up-4 flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all hover:scale-105 glow-indigo shadow-lg shadow-indigo-600/25">
                Analyse my resume →
              </Link>
              <Link href="/login" className="glass hover:border-indigo-600/40 text-slate-300 font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-105">
                Sign in
              </Link>
            </div>
          </div>

          {/* Right: animated demo card */}
          <div className="fade-up-4 flex-shrink-0 relative z-10">
            <HeroCard />
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-14 border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold gradient-text mb-1">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Interactive pipeline ── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Under the hood</h2>
              <p className="text-slate-400 text-sm">Two-stage pipeline keeps API costs near zero for weak matches.</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-0">
              {PIPELINE.map((p, i) => (
                <div key={p.label} className="flex flex-col md:flex-row items-center flex-1">
                  <div className={`group relative ${p.color} rounded-2xl p-4 text-center flex-1 cursor-default hover:scale-105 transition-all shadow-lg`}>
                    <div className="text-2xl mb-1.5">{p.icon}</div>
                    <div className="text-xs font-bold text-white">{p.label}</div>
                    <div className="text-[10px] text-white/60 mt-0.5">{p.desc}</div>
                    {/* Tooltip on hover */}
                    {i === 2 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        Saves ~80% of API quota
                      </div>
                    )}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="text-slate-600 text-xl my-2 md:my-0 md:mx-1 rotate-90 md:rotate-0 flex-shrink-0">→</div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">
              Embedding vectors are Redis-cached (24hr TTL) — identical inputs return in &lt;5ms.
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Full pipeline, not just a keyword checker</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">Every feature is designed around what actually gets you through ATS and into interviews.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className={`relative glass rounded-2xl p-6 group cursor-default transition-all duration-300 hover:-translate-y-1 ${f.border} overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                <div className="relative z-10">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-white transition-colors">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-20 px-6 bg-[rgb(20,20,35)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Four steps to a better resume</h2>
              <p className="text-slate-400 text-sm">From upload to offer in under five minutes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-600/40 to-transparent z-10" />
                  )}
                  <div className="glass rounded-2xl p-5 text-center h-full hover:border-indigo-700/40 transition-all hover:-translate-y-0.5">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-2xl font-black gradient-text mb-2">{s.n}</div>
                    <h3 className="font-bold text-white mb-1.5 text-sm">{s.title}</h3>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-28 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.18) 0%, transparent 70%)"
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5">
              Ready to <span className="gradient-text">beat the ATS?</span>
            </h2>
            <p className="text-slate-400 mb-8">Free to run. No credit card. Your resume + a JD = instant AI feedback.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all hover:scale-105 glow-indigo">
                Start for free →
              </Link>
              <Link href="/login" className="inline-block glass hover:border-indigo-600/40 text-slate-300 font-semibold px-10 py-4 rounded-2xl text-base transition-all hover:scale-105">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5 text-center text-xs text-slate-600">
          ResumeMatch AI · FastAPI · Next.js · Gemini 2.0 Flash · Groq · sentence-transformers · Redis
        </footer>
      </div>
    </>
  );
}
