import { useState, useEffect } from "react";
import { subscriptionApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Crown, Check, Zap, Star, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LangContext";

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  FREE: { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", text: "#94a3b8", badge: "bg-slate-700/30 text-slate-400" },
  CREATOR: { bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.25)", text: "#22d3ee", badge: "bg-cyan-500/15 text-cyan-400" },
};

export function SubscriptionPage() {
  const { } = useAuth();
  const { t } = useLang();
  const [tiers, setTiers] = useState<any[]>([]);
  const [mySub, setMySub] = useState<{ tier: string; subscription: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tiersRes, subRes] = await Promise.all([
        subscriptionApi.getTiers(),
        subscriptionApi.getMySubscription(),
      ]);
      setTiers(tiersRes.tiers);
      setMySub(subRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getTierLabel = (tierId: string, fallback?: string) => {
    if (tierId === "FREE") return t.subscription.tierFree;
    if (tierId === "CREATOR" || tierId === "PRO" || tierId === "PREMIUM") return t.subscription.tierCreator;
    return fallback ?? tierId;
  };

  const getTierFeatures = (tierId: string, fallback?: string[]) => {
    if (tierId === "FREE") {
      return [
        t.subscription.featureBasicFeedAccess,
        t.subscription.featureMarketplaceTrading,
        t.subscription.featureEarnRewardsFromAds,
        t.subscription.featureStandardAnalytics,
      ];
    }

    if (tierId === "CREATOR" || tierId === "PRO" || tierId === "PREMIUM") {
      return [
        t.subscription.featureUploadMusic,
        t.subscription.featureVirtualNftMinting,
        t.subscription.featureCreatorUploadCredits,
        t.subscription.featureMarketplaceTrading,
        t.subscription.featureCompetitionEntry,
      ];
    }

    return fallback ?? [];
  };

  const getSubscriptionStatusLabel = (status?: string) => {
    if (status === "ACTIVE") return t.subscription.statusActive;
    if (status === "CANCELED") return t.subscription.statusCanceled;
    if (status === "PAST_DUE") return t.subscription.statusPastDue;
    if (status === "TRIALING") return t.subscription.statusTrialing;
    if (status === "INCOMPLETE") return t.subscription.statusIncomplete;
    return status ?? "-";
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubscribe = async (tierId: string) => {
    setActionLoading(tierId);
    try {
      const res = await subscriptionApi.checkout(tierId);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      if (res.message) {
        toast.success(res.message);
      }
      await load();
    } catch (err: any) {
      toast.error(err?.message || t.subscription.failedCheckout);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm(t.subscription.cancelConfirm)) return;
    setActionLoading("cancel");
    try {
      const res = await subscriptionApi.cancel();
      toast.success(res.message);
      await load();
    } catch (err: any) {
      toast.error(err?.message || t.subscription.failedCancel);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
  );

  const currentTier = mySub?.tier || "FREE";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(34,211,238,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
            <Crown size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t.subscription.title}</h1>
            <p className="text-xs text-slate-400">{t.subscription.subtitle}</p>
          </div>
        </div>

        {/* Current plan badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-500">{t.subscription.currentPlan}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${TIER_COLORS[currentTier]?.badge}`}>
            {getTierLabel(currentTier)}
          </span>
          {mySub?.subscription?.cancelAtPeriodEnd && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
              {t.subscription.cancels} {new Date(mySub.subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tiers.map((tier: any) => {
          const colors = TIER_COLORS[tier.id] || TIER_COLORS.FREE;
          const features = getTierFeatures(tier.id, tier.features);
          const isCurrent = currentTier === tier.id;
          const isUpgrade = tier.id === "CREATOR" && currentTier === "FREE";

          return (
            <div key={tier.id} className="glass rounded-2xl p-5 border transition-all hover:scale-[1.01]"
              style={{
                background: colors.bg,
                borderColor: isCurrent ? colors.text : colors.border,
                boxShadow: isCurrent ? `0 0 20px ${colors.border}` : undefined,
              }}>
              {/* Tier badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {tier.id === "FREE" && <Star size={16} style={{ color: colors.text }} />}
                  {tier.id === "CREATOR" && <Zap size={16} style={{ color: colors.text }} />}
                  <h2 className="text-lg font-bold" style={{ color: colors.text }}>{getTierLabel(tier.id, tier.name)}</h2>
                </div>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${colors.text}20`, color: colors.text }}>
                    {t.subscription.current}
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${tier.monthlyPriceUsd}</span>
                {tier.monthlyPriceUsd > 0 && <span className="text-xs text-slate-500">{t.subscription.perMonth}</span>}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check size={12} className="mt-0.5 flex-shrink-0" style={{ color: colors.text }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              {tier.id === "FREE" ? (
                isCurrent ? (
                  <div className="text-center text-xs text-slate-600 py-2">{t.subscription.yourCurrentPlan}</div>
                ) : null
              ) : isCurrent ? (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === "cancel" || mySub?.subscription?.cancelAtPeriodEnd}
                  className="w-full py-2.5 rounded-xl text-xs font-medium border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "cancel" ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                  {mySub?.subscription?.cancelAtPeriodEnd ? t.subscription.cancellationPending : t.subscription.cancelSubscription}
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${colors.text}, ${colors.border})` }}
                >
                  {actionLoading === tier.id ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                  {t.subscription.subscribeTo} {getTierLabel(tier.id, tier.name)}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Subscription details */}
      {mySub?.subscription && (
        <div className="glass rounded-2xl p-4 border border-slate-700/10">
          <p className="text-xs font-semibold text-slate-400 mb-3">{t.subscription.billingDetails}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">{t.subscription.status}</span>
              <p className="text-white font-medium">{getSubscriptionStatusLabel(mySub.subscription.status)}</p>
            </div>
            <div>
              <span className="text-slate-500">{t.subscription.period}</span>
              <p className="text-white font-medium">
                {new Date(mySub.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(mySub.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
