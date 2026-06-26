import { useState } from "react";

interface ContactInfo {
  email:    string | null;
  phone:    string | null;
  linkedin: string | null;
  github:   string | null;
}

interface TFIDFKeyword {
  keyword:   string;
  jd_tf:     number;
  score:     number;
  in_resume: boolean;
}

interface Props {
  sections:          Record<string, string>;
  contact:           ContactInfo;
  completenessScore: number;
  missingSections:   string[];
  tfidfKeywords:     TFIDFKeyword[];
  loading:           boolean;
}

const SECTION_ICONS: Record<string, string> = {
  contact: "📧", summary: "📝", skills: "⚙️", experience: "💼",
  education: "🎓", projects: "🛠️", certifications: "🏅",
  awards: "🏆", languages: "🌐", publications: "📚",
};

function CompletenessRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circ  = 2 * Math.PI * 30;
  const dash  = (score / 100) * circ;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 72 72" className="w-24 h-24 -rotate-90">
        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function SectionCard({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false);
  const preview = content.slice(0, 120).replace(/\n/g, " ");
  const hasMore  = content.length > 120;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-200 capitalize">
          <span>{SECTION_ICONS[name] ?? "📄"}</span>{name}
        </span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      <div className={`px-4 pb-3 text-xs text-slate-400 leading-relaxed transition-all ${open ? "" : "line-clamp-2"}`}>
        {open ? content : preview + (hasMore && !open ? "…" : "")}
      </div>
    </div>
  );
}

function KeywordBar({ kw, maxScore }: { kw: TFIDFKeyword; maxScore: number }) {
  const pct   = maxScore > 0 ? (kw.score / maxScore) * 100 : 0;
  const color = kw.in_resume ? "#22c55e" : "#ef4444";

  return (
    <div className="flex items-center gap-2 group">
      <span className={`text-xs w-28 truncate font-mono ${kw.in_resume ? "text-emerald-400" : "text-red-400"}`}>
        {kw.keyword}
      </span>
      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-10 text-right">{(kw.score * 100).toFixed(1)}%</span>
      <span className={`text-[9px] w-4 ${kw.in_resume ? "text-emerald-500" : "text-red-500"}`}>
        {kw.in_resume ? "✓" : "✗"}
      </span>
    </div>
  );
}

export default function ResumeHealth({
  sections, contact, completenessScore, missingSections, tfidfKeywords, loading,
}: Props) {
  const [kwFilter, setKwFilter] = useState<"all" | "missing" | "matched">("all");

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 flex items-center justify-center text-slate-500 text-sm gap-2">
        <span className="w-4 h-4 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
        Parsing resume structure…
      </div>
    );
  }

  const filtered = tfidfKeywords.filter((k) =>
    kwFilter === "all" ? true : kwFilter === "missing" ? !k.in_resume : k.in_resume
  );
  const maxScore = Math.max(...tfidfKeywords.map((k) => k.score), 0.0001);
  const sectionNames = Object.keys(sections);

  return (
    <div className="flex flex-col gap-5">

      {/* Completeness + contact row */}
      <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start">
        <div className="flex items-center gap-4">
          <CompletenessRing score={completenessScore} />
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Resume Completeness</p>
            <p className="text-xs text-slate-400 max-w-xs">
              {completenessScore >= 80
                ? "Well-structured resume. All key sections present."
                : completenessScore >= 50
                ? "Good foundation — add missing sections to strengthen it."
                : "Thin resume. Add more sections to pass ATS screening."}
            </p>
            {missingSections.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {missingSections.map((s) => (
                  <span key={s} className="text-[10px] bg-amber-950/50 border border-amber-700/40 text-amber-400 px-2 py-0.5 rounded-full capitalize">
                    missing: {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact snapshot */}
        <div className="sm:ml-auto flex flex-col gap-1 text-xs text-slate-400 min-w-[160px]">
          <p className="text-xs font-semibold text-slate-300 mb-1">Contact detected</p>
          {contact.email    && <span>📧 {contact.email}</span>}
          {contact.phone    && <span>📞 {contact.phone}</span>}
          {contact.linkedin && <span>🔗 {contact.linkedin}</span>}
          {contact.github   && <span>🐙 {contact.github}</span>}
          {!contact.email && !contact.phone && !contact.linkedin && !contact.github && (
            <span className="text-amber-400">⚠ No contact info found</span>
          )}
        </div>
      </div>

      {/* Parsed sections */}
      {sectionNames.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-3">
            Detected Sections
            <span className="ml-2 text-xs font-normal text-slate-500">({sectionNames.length} found)</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sectionNames.map((name) => (
              <SectionCard key={name} name={name} content={sections[name]} />
            ))}
          </div>
        </div>
      )}

      {/* TF-IDF keyword chart */}
      {tfidfKeywords.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">
              JD Keyword Importance
              <span className="ml-2 text-xs font-normal text-slate-500">TF-IDF weight</span>
            </p>
            <div className="flex gap-1">
              {(["all", "missing", "matched"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setKwFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize transition-all ${
                    kwFilter === f
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map((kw) => (
              <KeywordBar key={kw.keyword} kw={kw} maxScore={maxScore} />
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>in resume</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>missing from resume</span>
          </div>
        </div>
      )}
    </div>
  );
}
