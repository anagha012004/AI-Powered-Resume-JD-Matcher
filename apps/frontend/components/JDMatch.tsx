import { useState } from "react";

interface HighlightedKeyword { keyword: string; found: boolean }

interface Props {
  matchPercentage: number;
  highlightedKeywords: HighlightedKeyword[];
  coveredRequirements: string[];
  missingRequirements: string[];
  jdText: string;
  tailoredResume: string;
}

function MatchRing({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const circ  = 2 * Math.PI * 26;
  const dash  = (pct / 100) * circ;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 60 60" className="w-20 h-20 -rotate-90">
        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

function highlightKeywords(text: string, keywords: HighlightedKeyword[]): string {
  let out = text;
  // Sort by length descending so longer phrases match first
  const sorted = [...keywords].sort((a, b) => b.keyword.length - a.keyword.length);
  for (const kw of sorted) {
    const esc = kw.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const color = kw.found ? "bg-emerald-800/60 text-emerald-300 rounded px-0.5" : "bg-red-900/50 text-red-300 rounded px-0.5";
    out = out.replace(new RegExp(`\\b(${esc})\\b`, "gi"), `<mark class="${color}">$1</mark>`);
  }
  return out;
}

export default function JDMatch({
  matchPercentage, highlightedKeywords, coveredRequirements,
  missingRequirements, jdText, tailoredResume,
}: Props) {
  const [view, setView] = useState<"split" | "jd" | "resume">("split");

  const highlightedJD      = highlightKeywords(jdText.replace(/\n/g, "<br/>"), highlightedKeywords);
  const highlightedResume  = highlightKeywords(tailoredResume.replace(/\n/g, "<br/>"), highlightedKeywords);

  return (
    <div className="flex flex-col gap-4">

      {/* Match header */}
      <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <MatchRing pct={matchPercentage} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">JD Match Score</p>
          <p className="text-xs text-slate-400 mb-3">
            {matchPercentage >= 75
              ? "Strong coverage — your tailored resume addresses the key requirements."
              : matchPercentage >= 50
              ? "Moderate coverage — consider a deeper tailoring pass."
              : "Low coverage — try Full Tailor or add missing keywords manually."}
          </p>
          {/* Keyword pills */}
          <div className="flex flex-wrap gap-1.5">
            {highlightedKeywords.map((kw) => (
              <span
                key={kw.keyword}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                  kw.found
                    ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40"
                    : "bg-red-950/50 text-red-400 border-red-800/40"
                }`}
              >
                {kw.found ? "✓" : "✗"} {kw.keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-emerald-400">{coveredRequirements.length}</div>
            <div className="text-[10px] text-slate-500">Covered</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{missingRequirements.length}</div>
            <div className="text-[10px] text-slate-500">Missing</div>
          </div>
        </div>
      </div>

      {/* Requirements */}
      {(coveredRequirements.length > 0 || missingRequirements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coveredRequirements.length > 0 && (
            <div className="glass rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-400 mb-2">✓ Covered Requirements</p>
              <ul className="flex flex-col gap-1">
                {coveredRequirements.map((r, i) => (
                  <li key={i} className="text-xs text-emerald-300 leading-snug">· {r}</li>
                ))}
              </ul>
            </div>
          )}
          {missingRequirements.length > 0 && (
            <div className="glass rounded-xl p-4">
              <p className="text-xs font-bold text-red-400 mb-2">✗ Missing Requirements</p>
              <ul className="flex flex-col gap-1">
                {missingRequirements.map((r, i) => (
                  <li key={i} className="text-xs text-red-300 leading-snug">· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Side-by-side view */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex gap-1 p-2 border-b border-white/5 bg-white/2">
          {(["split", "jd", "resume"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                view === v ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >{v === "split" ? "Side by Side" : v === "jd" ? "Job Description" : "Tailored Resume"}</button>
          ))}
          <p className="ml-auto text-[10px] text-slate-600 self-center pr-2">
            <span className="text-emerald-400">■</span> in resume &nbsp;
            <span className="text-red-400">■</span> missing
          </p>
        </div>

        <div className={`grid ${view === "split" ? "grid-cols-2" : "grid-cols-1"} gap-0 max-h-96 overflow-hidden`}>
          {(view === "split" || view === "jd") && (
            <div className={`p-4 overflow-y-auto max-h-96 ${view === "split" ? "border-r border-white/5" : ""}`}>
              <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Job Description</p>
              <div
                className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedJD }}
              />
            </div>
          )}
          {(view === "split" || view === "resume") && (
            <div className="p-4 overflow-y-auto max-h-96">
              <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Tailored Resume</p>
              <div
                className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedResume }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
