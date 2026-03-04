import { useState, useRef } from "react";
import { Upload, Music, Image, X, Loader2, ShieldCheck, AlertTriangle, Sparkles, ExternalLink, Mail } from "lucide-react";
import { musicApi, uploadApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { toast } from "sonner";

const GENRES = [
  "POP", "HIPHOP", "RNB", "EDM", "ROCK", "JAZZ", "CLASSICAL",
  "LOFI", "AMBIENT", "EXPERIMENTAL", "WORLD", "OTHER",
];

const CONTACT_EMAIL = "contact@musicfi.io";
const SUNO_AFFILIATE = "https://suno.com/?ref=musicfi";

export function UploadTrackPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("OTHER");
  const [tags, setTags] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [moodTags, setMoodTags] = useState("");
  const [publishNow, setPublishNow] = useState(true);

  // Copyright declarations
  const [copy1, setCopy1] = useState(false);
  const [copy2, setCopy2] = useState(false);
  const [copy3, setCopy3] = useState(false);
  const allCopyrightSigned = copy1 && copy2 && copy3;

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Music size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">Login to upload tracks</h3>
      </div>
    );
  }

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Get duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(Math.round(audio.duration));
      URL.revokeObjectURL(audio.src);
    });

    setAudioFile(file);
    setUploadingAudio(true);
    try {
      const res = await uploadApi.uploadAudio(file);
      setAudioUrl(res.url);
      toast.success("Audio uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Audio upload failed");
      setAudioFile(null);
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const res = await uploadApi.uploadMedia(file);
      setCoverUrl(res.url);
      toast.success("Cover uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Cover upload failed");
      setCoverFile(null);
      setCoverPreview("");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!audioUrl) { toast.error("Upload an audio file first"); return; }

    if (!allCopyrightSigned) { toast.error(t.copyrightRequired); return; }

    setSubmitting(true);
    try {
      await musicApi.createTrack({
        title: title.trim(),
        description: description.trim() || undefined,
        genre: genre as any,
        tags: tags.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean),
        moodTags: moodTags.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean),
        bpm: bpm ? parseInt(bpm) : undefined,
        key: musicalKey || undefined,
        duration: audioDuration ?? undefined,
        isAiGenerated: false,
        audioUrl,
        coverUrl: coverUrl || undefined,
        status: publishNow ? "PUBLISHED" : "DRAFT",
      });
      toast.success(publishNow ? "Track published!" : "Track saved as draft!");
      // Reset form
      setTitle(""); setDescription(""); setGenre("OTHER"); setTags(""); setMoodTags(""); setBpm("");
      setMusicalKey(""); setAudioFile(null); setAudioUrl("");
      setCoverFile(null); setCoverPreview(""); setCoverUrl(""); setAudioDuration(null);
      setCopy1(false); setCopy2(false); setCopy3(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create track");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Upload size={24} className="text-cyan-400" /> {t.uploadTitle}
      </h1>

      {/* AI Consultation Banner */}
      <div className="mb-6 p-4 rounded-2xl flex flex-col gap-3" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))", border: "1px solid rgba(139,92,246,0.25)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-400" />
          <h2 className="text-sm font-bold text-purple-300">{t.aiConsultTitle}</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{t.aiConsultBody}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={SUNO_AFFILIATE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:text-white transition-colors"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}
          >
            <Sparkles size={12} /> {t.aiConsultSunoLabel}
            <ExternalLink size={10} className="opacity-60" />
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=AI Music Consultation`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white transition-colors"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
          >
            <Mail size={12} /> {t.aiConsultContact}
          </a>
        </div>
        <p className="text-[10px] text-purple-400/70 italic">{t.aiConsultSunoNote}</p>
      </div>

      <div className="space-y-5">
        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t.uploadAudioLabel}</label>
          {audioFile ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <Music size={20} className="text-cyan-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{audioFile.name}</p>
                <p className="text-xs text-slate-500">{(audioFile.size / 1024 / 1024).toFixed(1)} MB{audioDuration ? ` · ${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, "0")}` : ""}</p>
              </div>
              {uploadingAudio ? (
                <Loader2 size={16} className="text-cyan-400 animate-spin" />
              ) : (
                <button onClick={() => { setAudioFile(null); setAudioUrl(""); }} className="p-1 text-slate-500 hover:text-red-400">
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => audioInputRef.current?.click()}
              className="w-full p-8 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-cyan-500/50 transition-colors flex flex-col items-center gap-2 text-slate-500 hover:text-cyan-400"
            >
              <Upload size={32} />
              <span className="text-sm font-medium">Click to upload audio</span>
              <span className="text-xs">{t.uploadAudioHint}</span>
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
        </div>

        {/* Platform disclaimer */}
        <div className="p-3 rounded-xl flex gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/80 leading-relaxed">{t.copyrightDisclaimer}</p>
        </div>

        {/* Cover Art */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t.uploadCoverLabel}</label>
          <div className="flex items-start gap-4">
            {coverPreview ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={20} className="text-cyan-400 animate-spin" />
                  </div>
                )}
                <button onClick={() => { setCoverFile(null); setCoverPreview(""); setCoverUrl(""); }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-500">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => coverInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-cyan-500/50 transition-colors flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-cyan-400 flex-shrink-0">
                <Image size={20} />
                <span className="text-[10px]">Add Cover</span>
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.uploadTitleLabel}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.uploadTitlePlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.uploadDescLabel}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t.uploadDescPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none" />
        </div>

        {/* Genre + BPM + Key */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.uploadGenreLabel}</label>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.uploadBpmLabel}</label>
            <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.uploadKeyLabel}</label>
            <input type="text" value={musicalKey} onChange={e => setMusicalKey(e.target.value)} placeholder="C#m"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.uploadTagsLabel}</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder={t.uploadTagsPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>

        {/* Mood Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.uploadMoodLabel}</label>
          <input type="text" value={moodTags} onChange={e => setMoodTags(e.target.value)} placeholder={t.uploadMoodPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          <p className="text-[10px] text-slate-500 mt-1">{t.uploadMoodHint}</p>
        </div>

        {/* Copyright Declaration */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-cyan-300">{t.copyrightTitle}</span>
          </div>
          {[
            { val: copy1, set: setCopy1, text: t.copyrightCheck1 },
            { val: copy2, set: setCopy2, text: t.copyrightCheck2 },
            { val: copy3, set: setCopy3, text: t.copyrightCheck3 },
          ].map((item, i) => (
            <label key={i} className="flex gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.val}
                onChange={e => item.set(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-cyan-500 flex-shrink-0"
              />
              <span className={`text-xs leading-relaxed transition-colors ${item.val ? "text-slate-300" : "text-slate-500 group-hover:text-slate-400"}`}>
                {item.text}
              </span>
            </label>
          ))}
        </div>

        {/* Publish toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500" />
          <span className="text-sm text-slate-300">{t.uploadPublishNow}</span>
        </label>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || uploadingAudio || !audioUrl || !title.trim() || !allCopyrightSigned}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {t.uploadCreating}</span>
          ) : (
            publishNow ? t.uploadPublishBtn : t.uploadDraftBtn
          )}
        </button>
      </div>
    </div>
  );
}
