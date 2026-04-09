import { useState } from "react";
import { Upload, Music, Crown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { UploadTrackPage } from "./UploadTrackPage";
import { MyMusicPage } from "./MyMusicPage";

export function CreatePage({ onOpenAuth, onNavigate }: { onOpenAuth?: () => void; onNavigate?: (page: string) => void }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<"upload" | "my-music">("upload");

  const isCreator = Boolean(
    user?.creatorAccessForced
    || ["CREATOR", "PRO", "PREMIUM"].includes((user?.subscriptionTier as string | undefined) ?? "")
  );

  const tabs = [
    { id: "upload" as const, label: t.createHub.upload, icon: Upload },
    { id: "my-music" as const, label: t.createHub.myTracks, icon: Music },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Upload size={28} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">{t.createHub.title}</h2>
        <p className="text-slate-500 text-sm max-w-xs">{t.createHub.guestBody}</p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc" }}
        >
          {t.createHub.signIn}
        </button>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
          <Crown size={28} className="text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">{t.createHub.creatorRequired}</h2>
        <p className="text-slate-500 text-sm max-w-xs">{t.createHub.creatorBody}</p>
        <div className="rounded-xl p-4 max-w-xs w-full text-left space-y-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          {[t.createHub.feature1, t.createHub.feature2, t.createHub.feature3, t.createHub.feature4].map(feat => (
            <div key={feat} className="flex items-center gap-2 text-xs text-slate-400">
              <Crown size={11} className="text-amber-400 flex-shrink-0" />
              {feat}
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate?.("me")}
          className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
        >
          {t.createHub.upgrade}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Creator badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <Crown size={13} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">{t.createHub.badge}</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
        {tabs.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === tab_.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
            style={tab === tab_.id ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)" } : undefined}
          >
            <tab_.icon size={15} />
            {tab_.label}
          </button>
        ))}
      </div>

      {tab === "upload" && <UploadTrackPage />}
      {tab === "my-music" && <MyMusicPage />}
    </div>
  );
}
