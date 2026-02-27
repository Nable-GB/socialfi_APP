import { useState, useRef } from "react";
import { Upload, Music, Sparkles, Image, X, Loader2 } from "lucide-react";
import { musicApi, uploadApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const GENRES = [
  "POP", "HIPHOP", "RNB", "EDM", "ROCK", "JAZZ", "CLASSICAL",
  "LOFI", "AMBIENT", "EXPERIMENTAL", "WORLD", "OTHER",
];

const AI_MODELS = ["Suno", "Udio", "MusicGen", "Stable Audio", "AIVA", "Amper", "Other"];

export function UploadTrackPage() {
  const { isAuthenticated } = useAuth();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("OTHER");
  const [tags, setTags] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [isAiGenerated, setIsAiGenerated] = useState(true);
  const [aiModel, setAiModel] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [moodTags, setMoodTags] = useState("");
  const [publishNow, setPublishNow] = useState(true);

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

    setSubmitting(true);
    try {
      await musicApi.createTrack({
        title: title.trim(),
        description: description.trim() || undefined,
        genre: genre as any,
        tags: tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
        moodTags: moodTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
        bpm: bpm ? parseInt(bpm) : undefined,
        key: musicalKey || undefined,
        duration: audioDuration ?? undefined,
        isAiGenerated,
        aiModel: isAiGenerated ? aiModel : undefined,
        aiPrompt: isAiGenerated ? aiPrompt : undefined,
        audioUrl,
        coverUrl: coverUrl || undefined,
        status: publishNow ? "PUBLISHED" : "DRAFT",
      });
      toast.success(publishNow ? "Track published!" : "Track saved as draft!");
      // Reset form
      setTitle(""); setDescription(""); setGenre("OTHER"); setTags(""); setMoodTags(""); setBpm("");
      setMusicalKey(""); setAiModel(""); setAiPrompt(""); setAudioFile(null); setAudioUrl("");
      setCoverFile(null); setCoverPreview(""); setCoverUrl(""); setAudioDuration(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to create track");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Upload size={24} className="text-cyan-400" /> Upload Track
      </h1>

      <div className="space-y-5">
        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Audio File *</label>
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
              <span className="text-xs">MP3, WAV, OGG, FLAC — max 50MB</span>
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
        </div>

        {/* Cover Art */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Cover Art</label>
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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My AI track"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Tell the story behind this track..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none" />
        </div>

        {/* Genre + BPM + Key */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Genre</label>
            <select value={genre} onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">BPM</label>
            <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Key</label>
            <input type="text" value={musicalKey} onChange={e => setMusicalKey(e.target.value)} placeholder="C#m"
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="chill, lo-fi, ambient (comma-separated)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
        </div>

        {/* Mood Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Mood Tags</label>
          <input type="text" value={moodTags} onChange={e => setMoodTags(e.target.value)} placeholder="chill, energetic, melancholic, uplifting (comma-separated)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" />
          <p className="text-[10px] text-slate-500 mt-1">Helps fans discover your track by mood</p>
        </div>

        {/* AI Generated toggle */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isAiGenerated} onChange={e => setIsAiGenerated(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-500" />
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-purple-300">AI Generated Track</span>
          </label>

          {isAiGenerated && (
            <div className="mt-3 space-y-3 pl-7">
              <div>
                <label className="block text-xs font-medium text-purple-300/70 mb-1">AI Model</label>
                <select value={aiModel} onChange={e => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  <option value="">Select model...</option>
                  {AI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-300/70 mb-1">AI Prompt</label>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2}
                  placeholder="The prompt you used to generate this track..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-purple-500/20 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Publish toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500" />
          <span className="text-sm text-slate-300">Publish immediately</span>
        </label>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || uploadingAudio || !audioUrl || !title.trim()}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Creating...</span>
          ) : (
            publishNow ? "Publish Track" : "Save as Draft"
          )}
        </button>
      </div>
    </div>
  );
}
