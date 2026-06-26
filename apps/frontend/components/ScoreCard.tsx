import { useEffect, useRef, useState } from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface SectionScores { skills: number; experience: number; education: number }

interface Props {
  score: number;
  justification: string;
  roleLevelMatch: string;
  strengths: string[];
  gaps: string[];
  sectionScores: SectionScores;
  atsFlags: string[];
  cacheHit: boolean;
  processingTimeMs: number;
}

function scoreColor(score: number) {
  if (score <= 40) return "#ef4444";
  if (score <= 70) return "#f59e0b";
  return "#22c55e";
}

function verdictConfig(level: string) {
  const m: Record<string, { bg: string; text: string; dot: string }> = {
    Perfect:  { bg: "bg-emerald-950/60 border-emerald-700/50", text: "text-emerald-400", dot: "bg-emerald-400" },
    Strong:   { bg: "bg-indigo-950/60 border-indigo-700/50",   text: "text-indigo-400",  dot: "bg-indigo-400"  },
    Partial:  { bg: "bg-amber-950/60 border-amber-700/50",     text: "text-amber-400",   dot: "bg-amber-400"   },
    Weak:     { bg: "bg-red-950/60 border-red-700/50",         text: "text-red-400",     dot: "bg-red-400"     },
    Unknown:  { bg: "bg-slate-800/60 border-slate-700/50",     text: "text-slate-400",   dot: "bg-slate-400"   },
  };
  return m[level] ?? m["Unknown"];
}

function AnimatedBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(value), 100); return () => clearTimeout(t); }, [value]);
  return (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function ScoreCard({
  score, justification, roleLevelMatch, strengths, gaps,
  sectionScores, atsFlags, cacheHit, processingTimeMs,
}: Props) {
  const color = scoreColor(score);
  const animatedScore = useCountUp(score);
  const verdict = verdictConfig(roleLevelMatch);
  const data = [{ value: score, fill: color }];

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Match Score</h2>
        <div className="flex items-center gap-2 text-xs">
          {cacheHit && <span className="bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 px-2 py-0.5 rounded-full">⚡ cached</span>}
          <span className="text-slate-500">{processingTimeMs}ms</span>
        </div>
      </div>

      {/* Score + verdict */}
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={210} endAngle={210 - (score / 100) * 240}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(255,255,255,0.05)" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold" style={{ color }}>{animatedScore}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className={`inline-flex items-center gap-1.5 self-start border px-3 py-1 rounded-full text-xs font-semibold ${verdict.bg} ${verdict.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${verdict.dot}`} />
            {roleLevelMatch} Match
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{justification}</p>
        </div>
      </div>

      {/* Section score bars */}
      <div className="flex flex-col gap-3">
        {Object.entries(sectionScores).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 capitalize w-20 flex-shrink-0">{key}</span>
            <AnimatedBar value={val as number} color={scoreColor(val as number)} />
            <span className="text-xs font-bold w-8 text-right" style={{ color: scoreColor(val as number) }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Strengths & Gaps */}
      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {strengths.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-400 mb-2">✓ Strengths</p>
              <ul className="flex flex-col gap-1">
                {strengths.map((s, i) => <li key={i} className="text-xs text-emerald-300 leading-snug">· {s}</li>)}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-400 mb-2">✗ Gaps</p>
              <ul className="flex flex-col gap-1">
                {gaps.map((g, i) => <li key={i} className="text-xs text-red-300 leading-snug">· {g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ATS flags */}
      {atsFlags.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-400 mb-2">⚠ ATS Flags</p>
          <ul className="flex flex-col gap-1">
            {atsFlags.map((f, i) => <li key={i} className="text-xs text-amber-300">· {f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
