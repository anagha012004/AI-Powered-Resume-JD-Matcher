import { useState, FormEvent, ReactNode } from "react";
import Link from "next/link";
import Head from "next/head";

interface Field { name: string; label: string; type: string; placeholder: string }

interface Props {
  title: string;
  subtitle: ReactNode;
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  footer: ReactNode;
}

export default function AuthForm({ title, subtitle, fields, submitLabel, onSubmit, footer }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>{title} · ResumeMatch AI</title></Head>
      <div className="min-h-screen bg-[rgb(15,15,25)] flex flex-col items-center justify-center px-4 relative overflow-hidden">

        {/* Animated background orbs */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 left-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
        <div className="fixed bottom-1/4 right-1/4 w-48 h-48 bg-pink-600/6 rounded-full blur-[80px] pointer-events-none animate-pulse-slow" />

        {/* Grid pattern */}
        <div className="fixed inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        {/* Logo */}
        <Link href="/" className="relative z-10 mb-8 flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform">
            RM
          </div>
          <span className="text-lg font-bold gradient-text">ResumeMatch AI</span>
        </Link>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Glow border effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600/30 via-purple-600/20 to-pink-600/30 rounded-3xl blur-sm" />
          <div className="relative glass rounded-3xl p-8 bg-[rgb(15,15,25)]">

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1.5">{title}</h1>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>

            <form onSubmit={handle} className="flex flex-col gap-4">
              {fields.map((f) => (
                <div key={f.name} className="group">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    required
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-indigo-950/20 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition-all"
                  />
                </div>
              ))}

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3">
                  <span className="mt-0.5 flex-shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-100 glow-indigo"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Please wait…
                  </span>
                ) : submitLabel}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-slate-500">
              {footer}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 mt-6 flex items-center gap-4 text-xs text-slate-600">
          <span>🔒 JWT secured</span>
          <span>·</span>
          <span>⚡ Powered by Gemini</span>
          <span>·</span>
          <span>🆓 Free forever</span>
        </div>
      </div>
    </>
  );
}
