import { useState } from "react";

interface RankedResume {
  rank: number;
  filename: string;
  match_score: number;
  justification: string;
}

interface Props {
  rankings: RankedResume[];
}

function scoreColor(score: number) {
  if (score <= 40) return "text-red-400";
  if (score <= 70) return "text-amber-400";
  return "text-green-400";
}

export default function RankingsTable({ rankings }: Props) {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rankings].sort((a, b) =>
    sortAsc ? a.match_score - b.match_score : b.match_score - a.match_score
  );

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-100">Resume Rankings</h2>
        <button
          onClick={() => setSortAsc((v) => !v)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Sort {sortAsc ? "▼ High first" : "▲ Low first"}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-left border-b border-gray-800">
            <th className="pb-2 w-10">#</th>
            <th className="pb-2">File</th>
            <th className="pb-2 w-20 text-right">Score</th>
            <th className="pb-2 pl-4">Justification</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.rank} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="py-2 text-gray-500">{r.rank}</td>
              <td className="py-2 font-medium truncate max-w-[12rem]">{r.filename}</td>
              <td className={`py-2 text-right font-bold text-lg ${scoreColor(r.match_score)}`}>
                {r.match_score}
              </td>
              <td className="py-2 pl-4 text-gray-400 text-xs">{r.justification}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
