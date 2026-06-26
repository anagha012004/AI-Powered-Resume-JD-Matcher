import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface SectionScores {
  skills: number;
  experience: number;
  education: number;
}

interface Props {
  score: number;
  justification: string;
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

export default function ScoreCard({
  score,
  justification,
  sectionScores,
  atsFlags,
  cacheHit,
  processingTimeMs,
}: Props) {
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-100">Match Score</h2>
        <div className="flex gap-2 text-xs text-gray-500">
          {cacheHit && <span className="bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">cached</span>}
          <span>{processingTimeMs}ms</span>
        </div>
      </div>

      {/* Radial gauge */}
      <div className="flex flex-col items-center">
        <div className="w-48 h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={data}
              startAngle={210}
              endAngle={210 - (score / 100) * 240}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#1f2937" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color }}>{score}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Justification */}
      <p className="text-sm text-gray-300 leading-relaxed">{justification}</p>

      {/* Section scores */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(sectionScores).map(([key, val]) => (
          <div key={key} className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-bold" style={{ color: scoreColor(val as number) }}>
              {val as number}
            </div>
            <div className="text-xs text-gray-400 capitalize">{key}</div>
          </div>
        ))}
      </div>

      {/* ATS flags */}
      {atsFlags.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">⚠ ATS Flags</p>
          <ul className="list-disc list-inside text-xs text-amber-300 space-y-0.5">
            {atsFlags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
