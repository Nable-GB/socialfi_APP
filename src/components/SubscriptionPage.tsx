import { useState, useEffect } from "react";
import { subscriptionApi } from "../lib/api";
import type { ApiSubscriptionTier } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Crown, Check, Zap, Star, RefreshCw, XCircle, Sparkles, Trophy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LangContext";

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  FREE: { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", text: "#94a3b8", badge: "bg-slate-700/30 text-slate-400" },
  PRO: { bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.25)", text: "#22d3ee", badge: "bg-cyan-500/15 text-cyan-400" },
  PREMIUM: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", text: "#c084fc", badge: "bg-purple-500/15 text-purple-300" },
};

const TIER_ICONS = {
  FREE: Star,
  PRO: Zap,
  PREMIUM: Sparkles,
} as const;

export function SubscriptionPage() {
  const { refreshUser } = useAuth();
  const { t } = useLang();
  const [tiers, setTiers] = useState<ApiSubscriptionTier[]>([]);
  const [mySub, setMySub] = useState<Awaited<ReturnType<typeof subscriptionApi.getMySubscription>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creatorCode, setCreatorCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [topArtistInfo, setTopArtistInfo] = useState<Awaited<ReturnType<typeof subscriptionApi.getTiers>>["topArtistInfo"] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tiersRes, subRes] = await Promise.all([
        subscriptionApi.getTiers(),
        subscriptionApi.getMySubscription(),
      ]);
      setTiers(tiersRes.tiers);
      setTopArtistInfo((tiersRes as any).topArtistInfo ?? null);
      setMySub(subRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getTierLabel = (tierId: string, fallback?: string) => {
    if (tierId === "FREE") return t.subscription.tierFree;
    if (tierId === "PRO") return t.subscription.tierPro;
    if (tierId === "PREMIUM") return t.subscription.tierPremium;
    if (tierId === "CREATOR") return t.subscription.tierPro;
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

    if (tierId === "PRO" || tierId === "CREATOR") {
      return [
        t.subscription.featureUploadMusic,
        t.subscription.featureVirtualNftMinting,
        t.subscription.featureCreatorUploadCredits,
        t.subscription.featureMarketplaceTrading,
        t.subscription.featureCompetitionEntry,
        t.subscription.featureArtistProfileTools,
      ];
    }

    if (tierId === "PREMIUM") {
      return [
        t.subscription.featureEverythingInPro,
        t.subscription.featureHigherDailyCaps,
        t.subscription.featureFasterPromotionTools,
        t.subscription.featurePrioritySupport,
        t.subscription.featurePremiumVisibility,
      ];
    }

    return fallback ?? [];
  };

  const getSubscriptionStatusLabel = (status?: string) => {
    if (status === "ACTIVE") return t.subscription.statusActive;
    if (status === "CANCELLED") return t.subscription.statusCanceled;
    if (status === "CANCELED") return t.subscription.statusCanceled;
    if (status === "PAST_DUE") return t.subscription.statusPastDue;
    if (status === "TRIALING") return t.subscription.statusTrialing;
    if (status === "INCOMPLETE") return t.subscription.statusIncomplete;
    return status ?? "-";
  };

  const getAccessSourceLabel = (paymentMethod?: string) => {
    if (paymentMethod === "CREATOR_CODE") return t.subscription.accessSourceCode;
    if (paymentMethod === "CRYPTO_USDT") return t.subscription.accessSourceUsdt;
    if (paymentMethod === "FIAT_STRIPE") return t.subscription.accessSourceStripe;
    return "-";
  };

  const formatBillingPeriod = (currentPeriodStart?: string, currentPeriodEnd?: string) => {
    if (!currentPeriodStart || !currentPeriodEnd) return t.subscription.noBillingPeriod;
    return `${new Date(currentPeriodStart).toLocaleDateString()} - ${new Date(currentPeriodEnd).toLocaleDateString()}`;
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubscribe = async (tierId: string) => {
    setActionLoading(tierId);
    try {
      const res = await subscriptionApi.checkout(tierId);
      if (res.message) {
        toast.success(res.message);
      }
      await Promise.all([load(), refreshUser()]);
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

  const handleRedeemCode = async () => {
    const normalizedCode = creatorCode.trim().toUpperCase();
    if (!normalizedCode) {
      setRedeemError(t.subscription.codeRequired);
      return;
    }

    setActionLoading("redeem");
    setRedeemError(null);
    try {
      const res = await subscriptionApi.redeemCode(normalizedCode);
      toast.success(res.message || t.subscription.redeemSuccess);
      setCreatorCode("");
      await Promise.all([load(), refreshUser()]);
    } catch (err: any) {
      const message = err?.message || t.subscription.redeemFailed;
      setRedeemError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
  );

  const currentTier = mySub?.tier === "CREATOR" ? "PRO" : (mySub?.tier || "FREE");
  const currentPaymentMethod = mySub?.subscription?.paymentMethod;
  const isComplimentaryCreator = currentPaymentMethod === "CREATOR_CODE";
  const isSmfiSubscription = currentPaymentMethod === "FIAT_STRIPE";
  const isUsdtSubscription = currentPaymentMethod === "CRYPTO_USDT";

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

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-2xl border border-slate-700/20 bg-slate-950/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{t.subscription.planOverviewLabel}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.subscription.planOverviewBody}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Trophy size={15} />
              {t.subscription.topArtistTitle}
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-100/80">{t.subscription.topArtistBody}</p>
          </div>
        </div>

        {/* Current plan badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-500">{t.subscription.currentPlan}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${TIER_COLORS[currentTier]?.badge}`}>
            {getTierLabel(currentTier)}
          </span>
          {isComplimentaryCreator && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              {t.subscription.complimentaryAccess}
            </span>
          )}
          {mySub?.subscription?.cancelAtPeriodEnd && mySub.subscription.currentPeriodEnd && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
              {t.subscription.cancels} {new Date(mySub.subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {currentTier === "FREE" && (
        <div className="glass rounded-2xl p-5 border border-cyan-500/15 bg-cyan-500/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{t.subscription.codeTitle}</h2>
              <p className="mt-1 text-xs text-slate-400">{t.subscription.codeSubtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={creatorCode}
              onChange={(e) => setCreatorCode(e.target.value.toUpperCase())}
              placeholder={t.subscription.codePlaceholder}
              className="h-11 flex-1 rounded-xl border border-slate-700/30 bg-slate-900/70 px-4 font-mono text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400/50"
            />
            <button
              onClick={handleRedeemCode}
              disabled={actionLoading === "redeem"}
              className="h-11 rounded-xl px-4 text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0891b2, #2563eb)" }}
            >
              {actionLoading === "redeem" ? t.subscription.redeemingCode : t.subscription.redeemCode}
            </button>
          </div>

          {redeemError && <p className="mt-3 text-xs text-red-400">{redeemError}</p>}
        </div>
      )}

      {/* Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const tierId = tier.id === "CREATOR" ? "PRO" : tier.id;
          const Icon = TIER_ICONS[tierId as keyof typeof TIER_ICONS] ?? Crown;
          const colors = TIER_COLORS[tierId] || TIER_COLORS.FREE;
          const features = getTierFeatures(tierId, tier.features);
          const isCurrent = currentTier === tierId;
          const isPaidTier = tierId !== "FREE";
          const currentRank = currentTier === "PREMIUM" ? 2 : currentTier === "PRO" ? 1 : 0;
          const tierRank = tierId === "PREMIUM" ? 2 : tierId === "PRO" ? 1 : 0;
          const canUpgrade = isPaidTier && currentRank < tierRank;
          const isDowngrade = isPaidTier && currentRank > tierRank;

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
                  <Icon size={16} style={{ color: colors.text }} />
                  <h2 className="text-lg font-bold" style={{ color: colors.text }}>{getTierLabel(tierId, tier.name)}</h2>
                </div>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${colors.text}20`, color: colors.text }}>
                    {t.subscription.current}
                  </span>
                )}
              </div>

              {tierId === "PREMIUM" && (
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-200">
                  <ShieldCheck size={12} /> {t.subscription.recommendedBadge}
                </div>
              )}

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">{tier.monthlyPriceSmfi ?? 0}</span>
                <span className="text-xs text-slate-500"> SMFI{(tier.monthlyPriceSmfi ?? 0) > 0 ? t.subscription.perMonth : ""}</span>
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
                isComplimentaryCreator ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-center text-xs font-medium text-emerald-300">
                    {t.subscription.complimentaryCurrentPlan}
                  </div>
                ) : isUsdtSubscription ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-center text-xs font-medium text-amber-200">
                    {t.subscription.managedCreatorPlan}
                  </div>
                ) : (
                <button
                  onClick={handleCancel}
                  disabled={!isSmfiSubscription || actionLoading === "cancel" || mySub?.subscription?.cancelAtPeriodEnd}
                  className="w-full py-2.5 rounded-xl text-xs font-medium border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "cancel" ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                  {mySub?.subscription?.cancelAtPeriodEnd ? t.subscription.cancellationPending : t.subscription.cancelSubscription}
                </button>
                )
              ) : canUpgrade ? (
                <button
                  onClick={() => handleSubscribe(tierId)}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${colors.text}, ${colors.border})` }}
                >
                  {actionLoading === tierId ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                  {t.subscription.subscribeTo} {getTierLabel(tierId, tier.name)}
                </button>
              ) : isDowngrade ? (
                <div className="rounded-xl border border-slate-700/25 bg-slate-900/30 px-3 py-3 text-center text-xs text-slate-400">
                  {t.subscription.downgradeManaged}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {topArtistInfo && (
        <div className="glass rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Trophy size={16} />
            {topArtistInfo.name ?? t.subscription.topArtistTitle}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">{topArtistInfo.how ?? t.subscription.topArtistBody}</p>
          <div className="mt-4 space-y-2">
            {(topArtistInfo.privileges ?? []).map((privilege: string) => (
              <div key={privilege} className="flex items-start gap-2 text-xs text-slate-300">
                <Check size={12} className="mt-0.5 text-amber-300" />
                {privilege}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription details */}
      {mySub?.subscription && (
        <div className="glass rounded-2xl p-4 border border-slate-700/10">
          <p className="text-xs font-semibold text-slate-400 mb-3">{t.subscription.billingDetails}</p>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div>
              <span className="text-slate-500">{t.subscription.status}</span>
              <p className="text-white font-medium">{getSubscriptionStatusLabel(mySub.subscription.status)}</p>
            </div>
            <div>
              <span className="text-slate-500">{t.subscription.period}</span>
              <p className="text-white font-medium">{formatBillingPeriod(mySub.subscription.currentPeriodStart, mySub.subscription.currentPeriodEnd)}</p>
            </div>
            <div>
              <span className="text-slate-500">{t.subscription.accessSource}</span>
              <p className="text-white font-medium">{getAccessSourceLabel(mySub.subscription.paymentMethod)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
