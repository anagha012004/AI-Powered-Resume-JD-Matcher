import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Cell
} from "recharts";

interface Props {
  matched: string[];
  missing: string[];
  onMissingClick: (keyword: string) => void;
}

export default function KeywordChart({ matched, missing, onMissingClick }: Props) {
  const data = [
    { name: "Matched", count: matched.length, fill: "#22c55e" },
    { name: "Missing", count: missing.length, fill: "#ef4444" },
  ];

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-100">Keywords</h2>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 13 }} width={64} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "none", borderRadius: 8 }}
            cursor={{ fill: "#1f2937" }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-green-400 font-semibold mb-1">✓ Matched</p>
          <div className="flex flex-wrap gap-1">
            {matched.map((k) => (
              <span key={k} className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-red-400 font-semibold mb-1">✗ Missing — click to get suggestions</p>
          <div className="flex flex-wrap gap-1">
            {missing.map((k) => (
              <button
                key={k}
                onClick={() => onMissingClick(k)}
                className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full hover:bg-red-800/70 transition-colors"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
