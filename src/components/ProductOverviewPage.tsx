import { Coins, Gem, Globe, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import { PRODUCT_OVERVIEW_GROUPS, PRODUCT_OVERVIEW_NOTES, PRODUCT_PHASES, type ProductPhaseStatus } from "../lib/productAlignment";

const PHASE_ICONS = {
  gem: Gem,
  trophy: Trophy,
  globe: Globe,
  coins: Coins,
} as const;

const STATUS_STYLES: Record<ProductPhaseStatus, string> = {
  live: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  rolling: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  planned: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  later: "border-purple-400/25 bg-purple-500/10 text-purple-200",
};

export function ProductOverviewPage() {
  const { t } = useLang();
  const po = t.productOverview as Record<string, any>;

  const getStatusLabel = (status: ProductPhaseStatus) => {
    if (status === "live") return po.statusLive;
    if (status === "rolling") return po.statusRolling;
    if (status === "planned") return po.statusPlanned;
    return po.statusLater;
  };

  const getItemIcon = (itemId: string) => {
    if (itemId === "free") return ShieldCheck;
    if (itemId === "pro") return Zap;
    if (itemId === "premium") return Sparkles;
    if (itemId === "competition") return Trophy;
    if (itemId === "distribution") return Globe;
    if (itemId === "musicNfts") return Gem;
    if (itemId === "dashboard") return Coins;
    if (itemId === "automation") return Zap;
    return Sparkles;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(8,20,36,0.92),rgba(13,24,42,0.84))] p-6 shadow-[0_24px_80px_rgba(8,47,73,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Globe size={12} />
              {po.badge}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">{po.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{po.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/30 bg-slate-950/40 px-4 py-3 text-xs leading-6 text-slate-300 lg:max-w-sm">
            <div className="font-semibold uppercase tracking-[0.18em] text-slate-400">{po.matrixTitle}</div>
            <div className="mt-2">{po.matrixBody}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-700/20 bg-slate-950/45 p-5">
          <h2 className="text-lg font-bold text-white">{po.phasesTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{po.phasesSub}</p>
          <div className="mt-5 space-y-4">
            {PRODUCT_PHASES.map((phase) => {
              const Icon = PHASE_ICONS[phase.icon];
              return (
                <div key={phase.id} className="rounded-2xl border border-slate-700/25 bg-slate-900/45 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{po[phase.id]}</div>
                        <h3 className="mt-1 text-base font-bold text-white">{po[`${phase.id}Title`]}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{po[`${phase.id}Desc`]}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[phase.status]}`}>
                      {getStatusLabel(phase.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-700/20 bg-slate-950/45 p-5">
          <h2 className="text-lg font-bold text-white">{po.entitlementsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{po.entitlementsSub}</p>
          <div className="mt-5 space-y-5">
            {PRODUCT_OVERVIEW_GROUPS.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-700/25 bg-slate-900/45 p-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">{po[`group${group.id[0].toUpperCase()}${group.id.slice(1)}`]}</h3>
                <div className="mt-4 grid gap-3">
                  {group.items.map((itemId) => {
                    const Icon = getItemIcon(itemId);
                    return (
                      <div key={itemId} className="flex items-start gap-3 rounded-2xl border border-slate-700/20 bg-slate-950/40 px-4 py-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/30 bg-slate-900/80 text-cyan-300">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{po[`${itemId}Label`]}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-400">{po[`${itemId}Desc`]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-amber-500/15 bg-amber-500/[0.06] p-5">
          <h2 className="text-lg font-bold text-white">{po.notesTitle}</h2>
          <div className="mt-4 space-y-3">
            {PRODUCT_OVERVIEW_NOTES.map((noteKey, index) => (
              <div key={noteKey} className="flex items-start gap-3 rounded-2xl border border-amber-500/10 bg-slate-950/35 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-200">{index + 1}</div>
                <p className="text-sm leading-6 text-slate-300">{po[noteKey]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-purple-500/15 bg-purple-500/[0.06] p-5">
          <h2 className="text-lg font-bold text-white">{po.ctaTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{po.ctaBody}</p>
          <div className="mt-5 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/25 bg-slate-950/40 p-4">
              <div className="font-semibold uppercase tracking-[0.18em] text-cyan-300">{po.nowLabel}</div>
              <div className="mt-2 leading-6">{po.nowBody}</div>
            </div>
            <div className="rounded-2xl border border-slate-700/25 bg-slate-950/40 p-4">
              <div className="font-semibold uppercase tracking-[0.18em] text-purple-300">{po.nextLabel}</div>
              <div className="mt-2 leading-6">{po.nextBody}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
