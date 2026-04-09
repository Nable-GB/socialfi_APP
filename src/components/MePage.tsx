import { useState } from "react";
import { User, BarChart3, Gem, Globe, Users, Crown, ArrowUpRight, Settings, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { ProfilePage } from "./ProfilePage";
import { RevenueDashboardPage } from "./RevenueDashboardPage";
import { MusicNFTPage } from "./MusicNFTPage";
import { DistributionSubmitPage } from "./DistributionSubmitPage";
import { ReferralPage } from "./ReferralPage";
import { SubscriptionPage } from "./SubscriptionPage";
import { TransactionsPage } from "./TransactionsPage";
import { SettingsPage } from "./SettingsPage";
import { WalletPage } from "./WalletPage";
import { AdminPage } from "./AdminPage";

interface CollapsibleSection {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  component: React.ReactNode;
  adminOnly?: boolean;
}

function Section({ section, isOpen, onToggle }: {
  section: CollapsibleSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: isOpen ? `1px solid ${section.color}30` : "1px solid rgba(148,163,184,0.07)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
        style={{ background: isOpen ? `${section.color}08` : "rgba(10,16,32,0.6)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${section.color}18`, border: `1px solid ${section.color}30` }}>
          <section.icon size={15} style={{ color: section.color }} />
        </div>
        <span className="text-sm font-semibold text-slate-200 flex-1">{section.label}</span>
        {isOpen ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
      </button>
      {isOpen && (
        <div className="border-t" style={{ borderColor: `${section.color}20` }}>
          {section.component}
        </div>
      )}
    </div>
  );
}

export function MePage({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["profile"]));

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 border border-cyan-500/30 flex items-center justify-center">
          <User size={28} className="text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">{t.meHub.title}</h2>
        <p className="text-slate-500 text-sm max-w-xs">{t.meHub.guestBody}</p>
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

  const isTopArtist = (user as any)?.isTopArtist;
  const isAdmin = user?.role === "ADMIN";

  const sections: CollapsibleSection[] = [
    { id: "profile",      label: t.meHub.profile,      icon: User,         color: "#22d3ee",  component: <ProfilePage /> },
    { id: "wallet",       label: t.meHub.wallet,       icon: Crown,        color: "#f59e0b",  component: <WalletPage /> },
    { id: "revenue",      label: t.meHub.revenue,      icon: BarChart3,    color: "#10b981",  component: <RevenueDashboardPage /> },
    { id: "music-nfts",   label: t.meHub.musicNfts,    icon: Gem,          color: "#a855f7",  component: <MusicNFTPage /> },
    { id: "subscription", label: t.meHub.subscription, icon: Crown,        color: "#f59e0b",  component: <SubscriptionPage /> },
    { id: "referrals",    label: t.meHub.referrals,    icon: Users,        color: "#06b6d4",  component: <ReferralPage /> },
    { id: "transactions", label: t.meHub.transactions, icon: ArrowUpRight, color: "#64748b",  component: <TransactionsPage /> },
    { id: "settings",     label: t.meHub.settings,     icon: Settings,     color: "#64748b",  component: <SettingsPage /> },
    ...(isTopArtist ? [{ id: "distribution", label: t.meHub.distribution, icon: Globe, color: "#34d399", component: <DistributionSubmitPage /> }] : []),
    ...(isAdmin ? [{ id: "admin", label: t.meHub.admin, icon: Trophy, color: "#e11d48", component: <AdminPage />, adminOnly: true }] : []),
  ];

  return (
    <div className="space-y-2">
      {/* User chip */}
      <div className="flex items-center gap-3 p-4 rounded-2xl mb-4"
        style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.08)" }}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
          {(user?.displayName ?? user?.username ?? "U")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-200 truncate">{user?.displayName ?? user?.username}</p>
          <p className="text-xs text-slate-500 font-mono truncate">@{user?.username}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isTopArtist && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {t.meHub.topArtist}
            </span>
          )}
          <span className="text-[10px] text-slate-600 font-mono capitalize">
            {(user as any)?.subscriptionTier?.toLowerCase() ?? "free"}
          </span>
        </div>
      </div>

      {sections.map(section => (
        <Section key={section.id} section={section} isOpen={openSections.has(section.id)} onToggle={() => toggleSection(section.id)} />
      ))}
    </div>
  );
}
