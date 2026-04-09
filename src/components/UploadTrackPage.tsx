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

function normalizeToken(value: string) {
  return value.trim().normalize("NFC").toLocaleLowerCase();
}

export function UploadTrackPage() {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { t } = useLang();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const uploadCreditCost = 1000;
  const uploadCredits = user?.uploadCredits ?? 0;
  const hasEnoughUploadCredits = uploadCredits >= uploadCreditCost;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState("OTHER");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  
  // Tag state
  const [tagInput, setTagInput] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  
  const [moodInput, setMoodInput] = useState("");
  const [moodList, setMoodList] = useState<string[]>([]);
  const [isTagComposing, setIsTagComposing] = useState(false);
  const [isMoodComposing, setIsMoodComposing] = useState(false);

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

  const commitTag = () => {
    const val = normalizeToken(tagInput);
    if (val && !tagsList.includes(val)) {
      setTagsList([...tagsList, val]);
    }
    setTagInput("");
  };

  const commitMood = () => {
    const val = normalizeToken(moodInput);
    if (val && !moodList.includes(val)) {
      setMoodList([...moodList, val]);
    }
    setMoodInput("");
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Music size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">{t.upload.loginToUpload}</h3>
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
      toast.success(t.upload.audioUploaded);
    } catch (err: any) {
      toast.error(err.message || t.upload.audioUploadFailed);
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
      toast.success(t.upload.coverUploaded);
    } catch (err: any) {
      toast.error(err.message || t.upload.coverUploadFailed);
      setCoverFile(null);
      setCoverPreview("");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error(t.upload.titleRequired); return; }
    if (!audioUrl) { toast.error(t.upload.uploadAudioFirst); return; }
    if (!hasEnoughUploadCredits) { toast.error(t.upload.notEnoughCredits); return; }

    if (!allCopyrightSigned) { toast.error(t.copyright.required); return; }

    setSubmitting(true);
    try {
      await musicApi.createTrack({
        title: title.trim(),
        description: description.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        genre: genre as any,
        tags: tagsList,
        moodTags: moodList,
        bpm: bpm ? parseInt(bpm) : undefined,
        key: musicalKey || undefined,
        duration: audioDuration ?? undefined,
        isAiGenerated: false,
        audioUrl,
        coverUrl: coverUrl || undefined,
        status: publishNow ? "PUBLISHED" : "DRAFT",
      });
      await refreshUser();
      toast.success(publishNow ? t.upload.trackPublished : t.upload.trackDraft);
      // Reset form
      setTitle(""); setDescription(""); setLyrics(""); setGenre("OTHER"); 
      setTagsList([]); setTagInput("");
      setMoodList([]); setMoodInput("");
      setBpm(""); setMusicalKey(""); 
      setAudioFile(null); setAudioUrl("");
      setCoverFile(null); setCoverPreview(""); setCoverUrl(""); setAudioDuration(null);
      setCopy1(false); setCopy2(false); setCopy3(false);
    } catch (err: any) {
      toast.error(err.message || t.upload.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Upload size={24} className="text-cyan-400" /> {t.upload.title}
      </h1>

      {/* AI Consultation Banner */}
      <div className="mb-6 p-4 rounded-2xl flex flex-col gap-3" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))", border: "1px solid rgba(139,92,246,0.25)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-400" />
          <h2 className="text-sm font-bold text-purple-300">{t.aiConsult.title}</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{t.aiConsult.body}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={SUNO_AFFILIATE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:text-white transition-colors"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}
          >
            <Sparkles size={12} /> {t.aiConsult.sunoLabel}
            <ExternalLink size={10} className="opacity-60" />
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=AI Music Consultation`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white transition-colors"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
          >
            <Mail size={12} /> {t.aiConsult.contact}
          </a>
        </div>
        <p className="text-[10px] text-purple-400/70 italic">{t.aiConsult.sunoNote}</p>
      </div>

      <div className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-4" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
        <div>
          <p className="text-xs font-semibold text-cyan-300">{t.upload.creditBalance}</p>
          <p className="text-sm text-slate-300">{uploadCredits} {t.upload.creditUnits}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{t.upload.creditCostLabel}</p>
          <p className={`text-sm font-semibold ${hasEnoughUploadCredits ? "text-white" : "text-amber-400"}`}>{uploadCreditCost} {t.upload.creditUnits}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t.upload.audioLabel}</label>
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
              <span className="text-sm font-medium">{t.upload.clickToUpload}</span>
              <span className="text-xs">{t.upload.audioHint}</span>
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
        </div>

        {/* Platform disclaimer */}
        <div className="p-3 rounded-xl flex gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/80 leading-relaxed">{t.copyright.disclaimer}</p>
        </div>

        {/* Cover Art */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">{t.upload.coverLabel}</label>
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
                <span className="text-[10px]">{t.upload.addCover}</span>
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.upload.titleLabel}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.upload.titlePlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.upload.descLabel}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t.upload.descPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Lyrics</label>
          <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={6} placeholder="Paste or write song lyrics here"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none" />
          <p className="text-[10px] text-slate-500 mt-1">Optional. Lyrics can be displayed in music discovery and exploration views.</p>
        </div>

        {/* Genre + BPM + Key */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.upload.genreLabel}</label>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
              {GENRES.map(g => (
                <option key={g} value={g}>
                  {/* @ts-ignore */}
                  {t.musicFeed.genres[g.toLowerCase()] || g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.upload.bpmLabel}</label>
            <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.upload.keyLabel}</label>
            <input type="text" value={musicalKey} onChange={e => setMusicalKey(e.target.value)} placeholder="C#m"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.upload.tagsLabel}</label>
          <div className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 focus-within:border-cyan-500/50 flex flex-wrap gap-2">
            {tagsList.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                #{tag}
                <button onClick={() => setTagsList(l => l.filter((_, idx) => idx !== i))} className="hover:text-white"><X size={10} /></button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onCompositionStart={() => setIsTagComposing(true)}
              onCompositionEnd={() => setIsTagComposing(false)}
              onKeyDown={e => {
                if (e.nativeEvent.isComposing || isTagComposing) return;
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitTag();
                } else if (e.key === 'Backspace' && !tagInput && tagsList.length > 0) {
                  setTagsList(tagsList.slice(0, -1));
                }
              }}
              placeholder={tagsList.length === 0 ? t.upload.tagsPlaceholder : ""}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 flex-1 min-w-[100px]"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{t.upload.tagHint}</p>
        </div>

        {/* Mood Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">{t.upload.moodLabel}</label>
          <div className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 focus-within:border-cyan-500/50 flex flex-wrap gap-2">
            {moodList.map((mood, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                {mood}
                <button onClick={() => setMoodList(l => l.filter((_, idx) => idx !== i))} className="hover:text-white"><X size={10} /></button>
              </span>
            ))}
            <input
              type="text"
              value={moodInput}
              onChange={e => setMoodInput(e.target.value)}
              onCompositionStart={() => setIsMoodComposing(true)}
              onCompositionEnd={() => setIsMoodComposing(false)}
              onKeyDown={e => {
                if (e.nativeEvent.isComposing || isMoodComposing) return;
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  commitMood();
                } else if (e.key === 'Backspace' && !moodInput && moodList.length > 0) {
                  setMoodList(moodList.slice(0, -1));
                }
              }}
              placeholder={moodList.length === 0 ? t.upload.moodPlaceholder : ""}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 flex-1 min-w-[100px]"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{t.upload.moodHint}</p>
        </div>

        {/* Copyright Declaration */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-cyan-300">{t.copyright.title}</span>
          </div>
          {[
            { val: copy1, set: setCopy1, text: t.copyright.check1 },
            { val: copy2, set: setCopy2, text: t.copyright.check2 },
            { val: copy3, set: setCopy3, text: t.copyright.check3 },
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
          <span className="text-sm text-slate-300">{t.upload.publishNow}</span>
        </label>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || uploadingAudio || !audioUrl || !title.trim() || !allCopyrightSigned || !hasEnoughUploadCredits}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {t.upload.creating}</span>
          ) : (
            publishNow ? t.upload.publishBtn : t.upload.draftBtn
          )}
        </button>
        {!hasEnoughUploadCredits && (
          <p className="text-xs text-amber-400 text-center">{t.upload.creditWarning}</p>
        )}
      </div>
    </div>
  );
}
