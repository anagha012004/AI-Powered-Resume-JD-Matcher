import { useState, useCallback } from "react";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

type Template    = "swiss_single" | "swiss_two" | "modern" | "modern_two";
type SectionType = "summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "custom";

interface ResumeSection {
  id:      string;
  type:    SectionType;
  title:   string;
  content: string;
  order:   number;
}

interface FontOptions {
  header_family: string;
  body_family:   string;
  base_size:     number;
  header_scale:  number;
}

interface Formatting {
  page_size:       "A4" | "Letter";
  margin_top:      number;
  margin_bottom:   number;
  margin_left:     number;
  margin_right:    number;
  section_spacing: number;
  item_spacing:    number;
  line_height:     number;
  compact_mode:    boolean;
  contact_icons:   boolean;
  accent_color:    string;
  fonts:           FontOptions;
}

interface ResumeData {
  name:     string;
  email:    string;
  phone:    string;
  linkedin: string;
  github:   string;
  location: string;
  sections: ResumeSection[];
}

interface Props {
  initialText?: string;   // plain-text resume to pre-populate from
  token: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATES: { id: Template; label: string; desc: string }[] = [
  { id: "swiss_single", label: "Swiss Single",  desc: "Traditional single column" },
  { id: "swiss_two",    label: "Swiss Two Col", desc: "Side column for skills/edu" },
  { id: "modern",       label: "Modern",        desc: "Clean contemporary layout" },
  { id: "modern_two",   label: "Modern Two Col",desc: "Dense split layout" },
];

const SECTION_TYPES: { type: SectionType; label: string; icon: string }[] = [
  { type: "summary",        label: "Summary",        icon: "📝" },
  { type: "experience",     label: "Experience",     icon: "💼" },
  { type: "skills",         label: "Skills",         icon: "⚙️" },
  { type: "education",      label: "Education",      icon: "🎓" },
  { type: "projects",       label: "Projects",       icon: "🛠️" },
  { type: "certifications", label: "Certifications", icon: "🏅" },
  { type: "custom",         label: "Custom Section", icon: "✏️" },
];

const FONTS = ["Helvetica", "Times-Roman", "Courier"];

const DEFAULT_FMT: Formatting = {
  page_size: "A4", margin_top: 40, margin_bottom: 40,
  margin_left: 50, margin_right: 50,
  section_spacing: 14, item_spacing: 5, line_height: 14,
  compact_mode: false, contact_icons: true, accent_color: "#6366f1",
  fonts: { header_family: "Helvetica", body_family: "Helvetica", base_size: 10, header_scale: 1.4 },
};

const ACCENT_COLORS = [
  { label: "Indigo",    value: "#6366f1" },
  { label: "Violet",    value: "#8b5cf6" },
  { label: "Rose",      value: "#f43f5e" },
  { label: "Emerald",   value: "#10b981" },
  { label: "Sky",       value: "#0ea5e9" },
  { label: "Slate",     value: "#475569" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Section Editor ────────────────────────────────────────────────────────────

function SectionEditor({
  section, onChange, onDelete, onMove, isFirst, isLast,
}: {
  section: ResumeSection;
  onChange: (s: ResumeSection) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(true);
  const meta = SECTION_TYPES.find((t) => t.type === section.type);

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/5">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/2 cursor-pointer select-none"
        onClick={() => setOpen(!open)}>
        <span className="text-sm">{meta?.icon ?? "📄"}</span>
        {section.type === "custom" ? (
          <input
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-sm font-semibold text-white flex-1 outline-none border-b border-white/10 focus:border-indigo-500"
            placeholder="Section title…"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-200 flex-1">{section.title}</span>
        )}
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} disabled={isFirst}
            className="text-slate-600 hover:text-white disabled:opacity-20 px-1 text-xs transition-colors">↑</button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1); }} disabled={isLast}
            className="text-slate-600 hover:text-white disabled:opacity-20 px-1 text-xs transition-colors">↓</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-slate-600 hover:text-red-400 px-1 text-xs transition-colors ml-1">✕</button>
          <span className="text-slate-600 text-xs ml-1">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3 pt-2">
          <textarea
            value={section.content}
            onChange={(e) => onChange({ ...section, content: e.target.value })}
            rows={section.type === "summary" ? 4 : section.type === "skills" ? 3 : 7}
            className="w-full bg-white/3 border border-white/8 rounded-lg p-3 text-xs text-slate-200 font-mono
              resize-y outline-none focus:border-indigo-500/60 leading-relaxed"
            placeholder={
              section.type === "experience"
                ? "Job Title | Company | Jan 2020 – Present\n- Led a team of 5 engineers…\n- Reduced latency by 40%…"
                : section.type === "skills"
                ? "- Python, FastAPI, PostgreSQL\n- Docker, Kubernetes, AWS"
                : section.type === "education"
                ? "B.Sc. Computer Science | MIT | 2018"
                : "Write content here…"
            }
          />
          <p className="text-[10px] text-slate-600 mt-1">
            Use "- " to start bullets · "Title | Company | Dates" for job entries
          </p>
        </div>
      )}
    </div>
  );
}

// ── Formatting Sidebar ────────────────────────────────────────────────────────

function FmtSlider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{label}</span><span>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-indigo-500 w-full h-1.5 cursor-pointer"
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResumeBuilder({ initialText, token }: Props) {
  const [resume, setResume] = useState<ResumeData>(() => ({
    name: "", email: "", phone: "", linkedin: "", github: "", location: "",
    sections: [
      { id: uid(), type: "summary",    title: "Summary",    content: "", order: 0 },
      { id: uid(), type: "experience", title: "Experience", content: "", order: 1 },
      { id: uid(), type: "skills",     title: "Skills",     content: "", order: 2 },
      { id: uid(), type: "education",  title: "Education",  content: "", order: 3 },
    ],
  }));

  const [template,     setTemplate]     = useState<Template>("modern");
  const [fmt,          setFmt]          = useState<Formatting>(DEFAULT_FMT);
  const [sidebarTab,   setSidebarTab]   = useState<"sections" | "format">("sections");
  const [exporting,    setExporting]    = useState(false);
  const [exportError,  setExportError]  = useState<string | null>(null);
  const [aiRegen,      setAiRegen]      = useState(false);
  const [regenSection, setRegenSection] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  // ── Import plain text into sections ──────────────────────────────────────
  function importText(text: string) {
    if (!text) return;
    // Simple heuristic: put everything in experience for now; user can reorganise
    setResume((r) => ({
      ...r,
      sections: r.sections.map((s) =>
        s.type === "experience" ? { ...s, content: text } : s
      ),
    }));
  }

  // ── Section mutations ─────────────────────────────────────────────────────
  function updateSection(id: string, updated: ResumeSection) {
    setResume((r) => ({ ...r, sections: r.sections.map((s) => s.id === id ? updated : s) }));
  }

  function deleteSection(id: string) {
    setResume((r) => ({ ...r, sections: r.sections.filter((s) => s.id !== id) }));
  }

  function moveSection(id: string, dir: -1 | 1) {
    setResume((r) => {
      const secs   = [...r.sections].sort((a, b) => a.order - b.order);
      const idx    = secs.findIndex((s) => s.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= secs.length) return r;
      [secs[idx].order, secs[newIdx].order] = [secs[newIdx].order, secs[idx].order];
      return { ...r, sections: secs };
    });
  }

  function addSection(type: SectionType) {
    const maxOrder = Math.max(0, ...resume.sections.map((s) => s.order));
    const meta = SECTION_TYPES.find((t) => t.type === type)!;
    setResume((r) => ({
      ...r,
      sections: [...r.sections, {
        id: uid(), type, title: meta.label, content: "", order: maxOrder + 1,
      }],
    }));
  }

  function setFmtField<K extends keyof Formatting>(key: K, value: Formatting[K]) {
    setFmt((f) => ({ ...f, [key]: value }));
  }

  // ── PDF export ────────────────────────────────────────────────────────────
  async function exportPDF() {
    setExporting(true);
    setExportError(null);
    try {
      const payload = {
        template,
        formatting: fmt,
        resume: {
          ...resume,
          sections: [...resume.sections]
            .sort((a, b) => a.order - b.order)
            .map(({ id, ...rest }) => rest),
        },
      };
      const res = await axios.post("/api/export/pdf", payload, {
        headers: { ...headers, "Content-Type": "application/json" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `resume_${template}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError("PDF export failed. Check backend is running and reportlab is installed.");
    } finally {
      setExporting(false);
    }
  }

  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-0 min-h-[70vh]">

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/2 flex-wrap">
        <span className="text-sm font-bold text-slate-300">Resume Builder</span>

        {/* Template selector */}
        <div className="flex gap-1 ml-auto">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              title={t.desc}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                template === t.id ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={exportPDF} disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
        >
          {exporting
            ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"/>
            : "⬇"} Export PDF
        </button>
      </div>

      {exportError && (
        <div className="text-xs text-red-400 bg-red-950/30 border-b border-red-800/30 px-4 py-2">{exportError}</div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* Left sidebar: sections / formatting */}
        <div className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col overflow-y-auto max-h-[80vh]">

          {/* Sidebar tabs */}
          <div className="flex gap-1 p-2 border-b border-white/5">
            {(["sections", "format"] as const).map((t) => (
              <button key={t} onClick={() => setSidebarTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  sidebarTab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}>{t}</button>
            ))}
          </div>

          <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">

            {sidebarTab === "sections" && (
              <>
                {/* Contact fields */}
                <div className="glass rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                  {([
                    ["name",     "Full Name"],
                    ["email",    "Email"],
                    ["phone",    "Phone"],
                    ["linkedin", "LinkedIn URL"],
                    ["github",   "GitHub URL"],
                    ["location", "Location"],
                  ] as [keyof ResumeData, string][]).map(([key, placeholder]) => (
                    key !== "sections" && (
                      <input key={key}
                        value={(resume[key] as string) || ""}
                        onChange={(e) => setResume((r) => ({ ...r, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/60 w-full"
                      />
                    )
                  ))}
                </div>

                {/* Add section */}
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Add Section</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SECTION_TYPES.map((st) => (
                      <button key={st.type} onClick={() => addSection(st.type)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-indigo-700/30 text-slate-400 hover:text-white rounded-lg text-[10px] transition-all">
                        {st.icon} {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {sidebarTab === "format" && (
              <div className="flex flex-col gap-4">

                {/* Page */}
                <div className="glass rounded-xl p-3 flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Page</p>
                  <div className="flex gap-1">
                    {(["A4", "Letter"] as const).map((ps) => (
                      <button key={ps} onClick={() => setFmtField("page_size", ps)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          fmt.page_size === ps ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                        }`}>{ps}</button>
                    ))}
                  </div>
                  <FmtSlider label="Margin L/R" value={fmt.margin_left} min={20} max={80}
                    onChange={(v) => setFmt((f) => ({ ...f, margin_left: v, margin_right: v }))} />
                  <FmtSlider label="Margin T/B" value={fmt.margin_top} min={20} max={80}
                    onChange={(v) => setFmt((f) => ({ ...f, margin_top: v, margin_bottom: v }))} />
                </div>

                {/* Spacing */}
                <div className="glass rounded-xl p-3 flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Spacing</p>
                  <FmtSlider label="Section spacing" value={fmt.section_spacing} min={4} max={30}
                    onChange={(v) => setFmtField("section_spacing", v)} />
                  <FmtSlider label="Item spacing"    value={fmt.item_spacing}    min={2} max={16}
                    onChange={(v) => setFmtField("item_spacing", v)} />
                  <FmtSlider label="Line height"     value={fmt.line_height}     min={10} max={22} step={0.5}
                    onChange={(v) => setFmtField("line_height", v)} />
                </div>

                {/* Typography */}
                <div className="glass rounded-xl p-3 flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Typography</p>
                  <FmtSlider label="Base font size"  value={fmt.fonts.base_size}    min={7} max={13} step={0.5}
                    onChange={(v) => setFmt((f) => ({ ...f, fonts: { ...f.fonts, base_size: v } }))} />
                  <FmtSlider label="Header scale"    value={fmt.fonts.header_scale} min={1} max={2.5} step={0.1}
                    onChange={(v) => setFmt((f) => ({ ...f, fonts: { ...f.fonts, header_scale: v } }))} />
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400">Header font</label>
                    <select value={fmt.fonts.header_family}
                      onChange={(e) => setFmt((f) => ({ ...f, fonts: { ...f.fonts, header_family: e.target.value } }))}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none">
                      {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400">Body font</label>
                    <select value={fmt.fonts.body_family}
                      onChange={(e) => setFmt((f) => ({ ...f, fonts: { ...f.fonts, body_family: e.target.value } }))}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none">
                      {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* Visual */}
                <div className="glass rounded-xl p-3 flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Visual</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Compact mode</span>
                    <button onClick={() => setFmtField("compact_mode", !fmt.compact_mode)}
                      className={`w-9 h-5 rounded-full transition-all ${fmt.compact_mode ? "bg-indigo-600" : "bg-white/10"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${fmt.compact_mode ? "translate-x-4" : ""}`}/>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Contact icons</span>
                    <button onClick={() => setFmtField("contact_icons", !fmt.contact_icons)}
                      className={`w-9 h-5 rounded-full transition-all ${fmt.contact_icons ? "bg-indigo-600" : "bg-white/10"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${fmt.contact_icons ? "translate-x-4" : ""}`}/>
                    </button>
                  </div>
                  {(template === "modern" || template === "modern_two") && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-slate-400">Accent color</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ACCENT_COLORS.map((ac) => (
                          <button key={ac.value} onClick={() => setFmtField("accent_color", ac.value)}
                            title={ac.label}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${fmt.accent_color === ac.value ? "border-white scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: ac.value }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main editor canvas */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[80vh] flex flex-col gap-3">

          {/* Live preview banner */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">
              Template: <span className="text-indigo-400 font-semibold">{TEMPLATES.find((t) => t.id === template)?.label}</span>
              {" · "}Accent: <span style={{ color: fmt.accent_color }}>■</span>
              {" · "}{fmt.page_size}
            </p>
            <p className="text-[10px] text-slate-600">{resume.sections.length} sections</p>
          </div>

          {/* Section editors */}
          {sortedSections.map((sec, idx) => (
            <SectionEditor
              key={sec.id}
              section={sec}
              onChange={(updated) => updateSection(sec.id, updated)}
              onDelete={() => deleteSection(sec.id)}
              onMove={(dir) => moveSection(sec.id, dir)}
              isFirst={idx === 0}
              isLast={idx === sortedSections.length - 1}
            />
          ))}

          {sortedSections.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-slate-500 text-sm">
              Add sections from the sidebar to build your resume.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
