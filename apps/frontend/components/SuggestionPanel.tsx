import { useState } from "react";

interface SuggestedEdit {
  section:   string;
  original:  string | null;
  suggested: string;
  reason:    string;
}

interface Props {
  edits:          SuggestedEdit[];
  keywordsToAdd:  string[];
  summaryRewrite?: string | null;
  loading:        boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-all
        border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400"
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function EditCard({ edit, index }: { edit: SuggestedEdit; index: number }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] font-bold bg-indigo-900/50 text-indigo-300 border border-indigo-700/40 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
          {edit.section}
        </span>
        <span className="text-[10px] text-slate-600">#{index + 1}</span>
      </div>

      <div className="p-4 flex flex-col gap-2">
        {/* Original (strikethrough) */}
        {edit.original && (
          <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
            <p className="text-xs text-red-300/70 line-through leading-relaxed flex-1">{edit.original}</p>
          </div>
        )}

        {/* Suggested */}
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
          <p className="text-xs text-emerald-300 leading-relaxed flex-1">{edit.suggested}</p>
          <CopyButton text={edit.suggested} />
        </div>

        {/* Reason */}
        <p className="text-[11px] text-slate-500 italic leading-relaxed">{edit.reason}</p>
      </div>
    </div>
  );
}

export default function SuggestionPanel({ edits, keywordsToAdd, summaryRewrite, loading }: Props) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 flex items-center justify-center text-slate-500 text-sm gap-2">
        <span className="w-4 h-4 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
        Generating AI suggestions…
      </div>
    );
  }

  if (!edits.length && !summaryRewrite) return null;

  const allSuggested = [
    summaryRewrite ? `SUMMARY:\n${summaryRewrite}` : "",
    ...edits.map((e) => `[${e.section}]\n${e.suggested}`),
  ].filter(Boolean).join("\n\n");

  async function copyAll() {
    await navigator.clipboard.writeText(allSuggested);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">
          Suggested Edits
          <span className="ml-2 text-xs font-normal text-slate-500">({edits.length} rewrites)</span>
        </h2>
        <button
          onClick={copyAll}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-700/40 transition-all"
        >
          {copied ? "✓ All copied" : "📋 Copy all"}
        </button>
      </div>

      {/* Summary rewrite */}
      {summaryRewrite && (
        <div className="glass rounded-xl p-4 border border-indigo-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Summary Rewrite</span>
            <CopyButton text={summaryRewrite} />
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{summaryRewrite}</p>
        </div>
      )}

      {/* Edit cards */}
      {edits.map((edit, i) => <EditCard key={i} edit={edit} index={i} />)}

      {/* Keywords to add */}
      {keywordsToAdd.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">🔑 Keywords to weave in</p>
          <div className="flex flex-wrap gap-1.5">
            {keywordsToAdd.map((k) => (
              <span key={k} className="bg-indigo-950/50 border border-indigo-700/40 text-indigo-300 text-xs px-2.5 py-1 rounded-full">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
