interface SuggestedEdit {
  section: string;
  original: string | null;
  suggested: string;
  reason: string;
}

interface Props {
  edits: SuggestedEdit[];
  keywordsToAdd: string[];
  summaryRewrite?: string | null;
  loading: boolean;
}

export default function SuggestionPanel({ edits, keywordsToAdd, summaryRewrite, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-400" />
      </div>
    );
  }

  if (!edits.length && !summaryRewrite) return null;

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-gray-100">Suggested Edits</h2>

      {summaryRewrite && (
        <div className="border border-indigo-700/50 rounded-xl p-4 bg-indigo-950/30">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Summary Rewrite</span>
          <p className="mt-1 text-sm text-gray-200 leading-relaxed">{summaryRewrite}</p>
        </div>
      )}

      {edits.map((edit, i) => (
        <div key={i} className="flex flex-col gap-2 border border-gray-700 rounded-xl p-4">
          <span className="text-xs font-semibold text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded-full w-fit">
            {edit.section}
          </span>
          {edit.original && (
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 line-through">
              {edit.original}
            </div>
          )}
          <div className="bg-green-950/40 border border-green-800/50 rounded-lg px-3 py-2 text-sm text-green-300">
            {edit.suggested}
          </div>
          <p className="text-xs text-gray-500 italic">{edit.reason}</p>
        </div>
      ))}

      {keywordsToAdd.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-300 mb-2">Keywords to add</p>
          <div className="flex flex-wrap gap-2">
            {keywordsToAdd.map((k) => (
              <span key={k} className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-1 rounded-full">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
