import { useState } from "react";
import { Globe, CheckCircle, Mail, Music, Send, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import { toast } from "sonner";

const CONTACT_EMAIL = "contact@musicfi.io";
const SUBMIT_FORM_URL = "https://forms.gle/musicfi-distribution"; // replace with real form URL

const PLATFORMS = [
  { id: "spotify",    label: "Spotify",     color: "text-green-400",  bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)" },
  { id: "apple",      label: "Apple Music", color: "text-pink-400",   bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.25)" },
  { id: "melon",      label: "Melon",       color: "text-yellow-400", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.25)" },
  { id: "genie",      label: "Genie",       color: "text-blue-400",   bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" },
  { id: "flo",        label: "Flo",         color: "text-purple-400", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)" },
  { id: "youtube",    label: "YouTube Music",color: "text-red-400",   bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)" },
  { id: "amazon",     label: "Amazon Music",color: "text-cyan-400",   bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.25)" },
  { id: "tidal",      label: "Tidal",       color: "text-slate-300",  bg: "rgba(148,163,184,0.12)",border: "rgba(148,163,184,0.25)" },
];

export function DistributionSubmitPage() {
  const { t } = useLang();

  const [artistName, setArtistName] = useState("");
  const [email, setEmail] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!artistName.trim() || !email.trim() || !trackTitle.trim()) {
      toast.error("Please fill in Artist Name, Email, and Track/Album title.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one target platform.");
      return;
    }

    setSubmitting(true);
    // Simulate submission — in production wire to a backend endpoint or form service
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    toast.success(t.distribution.success);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-2 py-10 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">{t.distribution.success}</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Our curators will review your submission. If it meets our quality criteria, we will reach out to initiate the contract-signing process.
          </p>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-cyan-300 hover:text-white transition-colors"
          style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
        >
          <Mail size={14} /> {CONTACT_EMAIL}
        </a>
        <button
          onClick={() => { setSubmitted(false); setArtistName(""); setEmail(""); setTrackTitle(""); setMessage(""); setSelectedPlatforms([]); }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Submit another track →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
          <Globe size={24} className="text-cyan-400" /> {t.distribution.title}
        </h1>
        <p className="text-sm text-slate-400">{t.distribution.subtitle}</p>
      </div>

      {/* How it works */}
      <div className="mb-6 p-4 rounded-2xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.15)" }}>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">{t.distribution.body}</p>

        {/* Process steps */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "01", label: "Submit", desc: "Fill out the form below" },
            { step: "02", label: "Curate", desc: "Quality review by our team" },
            { step: "03", label: "Distribute", desc: "Contract sign + go live" },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center text-center p-2 rounded-xl" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
              <span className="text-[10px] font-black text-cyan-500 mb-1">{s.step}</span>
              <span className="text-xs font-semibold text-white">{s.label}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning banner */}
      <div className="mb-5 p-3 rounded-xl flex gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/80 leading-relaxed">{t.distribution.note}</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Artist name + email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.distribution.nameLabel} *</label>
            <input
              type="text"
              value={artistName}
              onChange={e => setArtistName(e.target.value)}
              placeholder="Your artist name"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.distribution.emailLabel} *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Track title */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">{t.distribution.trackLabel} *</label>
          <input
            type="text"
            value={trackTitle}
            onChange={e => setTrackTitle(e.target.value)}
            placeholder="Album / Single title"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Platform selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">{t.distribution.platforms} *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map(pl => {
              const selected = selectedPlatforms.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => togglePlatform(pl.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left`}
                  style={{
                    background: selected ? pl.bg : "rgba(30,41,59,0.4)",
                    border: `1px solid ${selected ? pl.border : "rgba(100,116,139,0.15)"}`,
                    color: selected ? undefined : "#64748b",
                  }}
                >
                  <Music size={10} className={selected ? pl.color : "text-slate-600"} />
                  <span className={selected ? pl.color : ""}>{pl.label}</span>
                  {selected && <CheckCircle size={9} className={`ml-auto ${pl.color}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">{t.distribution.messageLabel}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder={t.distribution.messagePlaceholder}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" /> {t.distribution.submitting}</>
            : <><Send size={14} /> {t.distribution.submitBtn}</>
          }
        </button>

        {/* Direct contact */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500 mb-2">{t.distribution.contactDirect}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Distribution Inquiry`}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Mail size={12} /> {CONTACT_EMAIL}
          </a>
          {SUBMIT_FORM_URL.startsWith("https://forms") && (
            <a
              href={SUBMIT_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink size={11} /> Online Form
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
