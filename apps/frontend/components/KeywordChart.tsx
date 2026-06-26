import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  matched: string[];
  missing: string[];
  sectionScores?: { skills: number; experience: number; education: number };
  onMissingClick: (keyword: string) => void;
}

export default function KeywordChart({ matched, missing, sectionScores, onMissingClick }: Props) {
  const radarData = sectionScores ? [
    { subject: "Skills",      score: sectionScores.skills      },
    { subject: "Experience",  score: sectionScores.experience  },
    { subject: "Education",   score: sectionScores.education   },
    { subject: "Keywords",    score: matched.length > 0 ? Math.round(matched.length / (matched.length + missing.length) * 100) : 0 },
  ] : [];

  const coveragePercent = matched.length + missing.length > 0
    ? Math.round((matched.length / (matched.length + missing.length)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Radar + coverage */}
      {sectionScores && (
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-72 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="62%" margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} tickSize={4} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "#0f0f19", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => [`${v}`, "Score"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-4xl font-extrabold gradient-text">{coveragePercent}%</div>
              <div className="text-xs text-slate-400 mt-1">Keyword Coverage</div>
              <div className="text-xs text-slate-500 mt-0.5">{matched.length} matched · {missing.length} missing</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click any <span className="text-red-400 font-semibold">missing keyword</span> to instantly generate AI suggestions for that gap.
            </p>
          </div>
        </div>
      )}

      {/* Keyword pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Matched ({matched.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((k) => (
              <span key={k} className="bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 text-xs px-2.5 py-1 rounded-full">
                {k}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Missing — click to fix ({missing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((k) => (
              <button
                key={k}
                onClick={() => onMissingClick(k)}
                className="bg-red-950/50 text-red-300 border border-red-800/40 text-xs px-2.5 py-1 rounded-full hover:bg-red-800/60 hover:border-red-600/60 hover:scale-105 transition-all"
              >
                + {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
