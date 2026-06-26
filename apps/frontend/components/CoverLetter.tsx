import { useState } from "react";
import axios from "axios";

interface Props {
  resumeText: string;
  jdText: string;
  token: string;
}

type Tone = "professional" | "enthusiastic" | "concise";
type Platform = "linkedin" | "email" | "cold_email";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all"
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

export default function CoverLetter({ resumeText, jdText, token }: Props) {
  const [mode, setMode]               = useState<"letter" | "outreach">("letter");
  const [tone, setTone]               = useState<Tone>("professional");
  const [platform, setPlatform]       = useState<Platform>("linkedin");
  const [letter, setLetter]           = useState<{ cover_letter: string; subject_line: string } | null>(null);
  const [outreach, setOutreach]       = useState<{ message: string; subject: string | null } | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [retryIn, setRetryIn]         = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  function parseRetryAfter(detail: string): number | null {
    const m = detail.match(/(\d+)s/);
    return m ? parseInt(m[1], 10) : null;
  }

  function startCountdown(seconds: number) {
    setRetryIn(seconds);
    const interval = setInterval(() => {
      setRetryIn((prev) => {
        if (prev === null || prev <= 1) { clearInterval(interval); return null; }
        return prev - 1;
      });
    }, 1000);
  }

  async function generate() {
    setError(null);
    setRetryIn(null);
    setLoading(true);
    try {
      if (mode === "letter") {
        const res = await axios.post("/api/cover-letter", { resume_text: resumeText, jd_text: jdText, tone }, { headers });
        setLetter(res.data);
      } else {
        const res = await axios.post("/api/outreach", { resume_text: resumeText, jd_text: jdText, platform }, { headers });
        setOutreach(res.data);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? "Generation failed. Please try again.";
      if (status === 429) {
        const secs = parseRetryAfter(detail);
        setError(detail);
        if (secs) startCountdown(secs);
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["letter", "outreach"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === m ? "bg-indigo-600 text-white" : "glass text-slate-400 hover:text-white"
            }`}
          >
            {m === "letter" ? "📝 Cover Letter" : "💬 Outreach Message"}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-4 items-end">
        {mode === "letter" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold">Tone</label>
            <div className="flex gap-1.5">
              {(["professional", "enthusiastic", "concise"] as Tone[]).map((t) => (
                <button key={t} onClick={() => setTone(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    tone === t ? "bg-purple-700 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold">Platform</label>
            <div className="flex gap-1.5">
              {(["linkedin", "email", "cold_email"] as Platform[]).map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    platform === p ? "bg-purple-700 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >{p.replace("_", " ")}</button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={generate} disabled={loading || !resumeText || !jdText}
          className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
        >
          {loading ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : "✨"}
          Generate
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-700/40 rounded-xl px-4 py-3">
          <span className="text-amber-400 flex-shrink-0 mt-0.5">{retryIn ? "⏳" : "⚠"}</span>
          <div className="flex-1">
            <p className="text-xs text-amber-300">{error}</p>
            {retryIn && (
              <p className="text-xs text-amber-500 mt-1">
                Auto-retry available in <span className="font-bold text-amber-300">{retryIn}s</span>
                {" — or wait and click Generate again."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cover letter result */}
      {mode === "letter" && letter && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <span className="text-xs font-bold text-slate-300">Subject: </span>
              <span className="text-xs text-indigo-300">{letter.subject_line}</span>
            </div>
            <CopyBtn text={`Subject: ${letter.subject_line}\n\n${letter.cover_letter}`} />
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{letter.cover_letter}</p>
          </div>
        </div>
      )}

      {/* Outreach result */}
      {mode === "outreach" && outreach && (
        <div className="glass rounded-2xl overflow-hidden">
          {outreach.subject && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs text-slate-300"><b>Subject:</b> {outreach.subject}</span>
            </div>
          )}
          <div className="p-5 flex items-start justify-between gap-3">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap flex-1">{outreach.message}</p>
            <CopyBtn text={outreach.subject ? `Subject: ${outreach.subject}\n\n${outreach.message}` : outreach.message} />
          </div>
          {platform === "linkedin" && (
            <div className="px-4 pb-3">
              <span className={`text-[10px] ${outreach.message.length > 300 ? "text-amber-400" : "text-emerald-400"}`}>
                {outreach.message.length} / 300 chars
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
