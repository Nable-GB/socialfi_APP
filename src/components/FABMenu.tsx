import { useState } from "react";
import { Plus, Upload, Trophy, Tag, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";

interface FABMenuProps {
  onNavigate: (page: string) => void;
  onOpenAuth: () => void;
}

export function FABMenu({ onNavigate, onOpenAuth }: FABMenuProps) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { t } = useLang();

  const actions = [
    { id: "upload", label: t.fab.upload, icon: Upload, color: "#22d3ee", bg: "rgba(34,211,238,0.15)", border: "rgba(34,211,238,0.3)" },
    { id: "compete", label: t.fab.enterCompetition, icon: Trophy, color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" },
    { id: "brochure", label: t.fab.browseBrochures, icon: Tag, color: "#a855f7", bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.3)" },
  ];

  const handleAction = (id: string) => {
    setOpen(false);
    if (!isAuthenticated && id !== "brochure") { onOpenAuth(); return; }
    if (id === "upload") { onNavigate("create"); return; }
    if (id === "compete") { onNavigate("create"); return; }
    if (id === "brochure") { onNavigate("compete"); return; }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
      {/* Action buttons */}
      {open && (
        <>
          {actions.map((action, i) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-all hover:scale-105 fade-in"
              style={{
                background: action.bg,
                border: `1px solid ${action.border}`,
                color: action.color,
                animationDelay: `${i * 50}ms`,
                backdropFilter: "blur(12px)",
              }}
            >
              <action.icon size={15} />
              {action.label}
            </button>
          ))}
        </>
      )}

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: open
            ? "rgba(148,163,184,0.15)"
            : "linear-gradient(135deg, #22d3ee, #6366f1)",
          border: open ? "1px solid rgba(148,163,184,0.3)" : "none",
          boxShadow: open ? "none" : "0 0 24px rgba(34,211,238,0.35)",
        }}
      >
        {open
          ? <X size={22} className="text-slate-300" />
          : <Plus size={22} className="text-white" />
        }
      </button>
    </div>
  );
}
