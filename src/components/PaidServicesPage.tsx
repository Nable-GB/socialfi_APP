import { useState, useEffect } from "react";
import { serviceApi } from "../lib/api";
import {
  Rocket, BadgeCheck, BarChart2, Shield, HardDrive,
  RefreshCw, ShoppingCart, Clock, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  BOOST_POST: <Rocket size={18} />,
  PREMIUM_BADGE: <BadgeCheck size={18} />,
  ANALYTICS_PRO: <BarChart2 size={18} />,
  VERIFIED_BADGE: <Shield size={18} />,
  EXTRA_STORAGE: <HardDrive size={18} />,
};

const SERVICE_COLORS: Record<string, string> = {
  BOOST_POST: "#f59e0b",
  PREMIUM_BADGE: "#ec4899",
  ANALYTICS_PRO: "#6366f1",
  VERIFIED_BADGE: "#22d3ee",
  EXTRA_STORAGE: "#10b981",
};

export function PaidServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"services" | "history">("services");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [svcRes, purchRes] = await Promise.all([
          serviceApi.list(),
          serviceApi.myPurchases(),
        ]);
        setServices(svcRes.services);
        setPurchases(purchRes.purchases);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleBuy = async (serviceId: string) => {
    setBuyLoading(serviceId);
    try {
      const res = await serviceApi.checkout(serviceId);
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed");
    } finally {
      setBuyLoading(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.2),rgba(236,72,153,0.2))", border: "1px solid rgba(245,158,11,0.3)" }}>
            <ShoppingCart size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Paid Services</h1>
            <p className="text-xs text-slate-400">Boost your presence with one-time purchases</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => setTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${tab === "services" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-500 border border-transparent"}`}>
            Available Services
          </button>
          <button onClick={() => setTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${tab === "history" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25" : "text-slate-500 border border-transparent"}`}>
            Purchase History ({purchases.length})
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {tab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc: any) => {
            const color = SERVICE_COLORS[svc.type] || "#94a3b8";
            const icon = SERVICE_ICONS[svc.type];

            return (
              <div key={svc.id} className="glass rounded-2xl p-5 border border-slate-700/10 hover:border-slate-600/20 transition-all">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                  {icon}
                </div>

                {/* Name & Description */}
                <h3 className="text-sm font-bold text-white mb-1">{svc.name}</h3>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">{svc.description}</p>

                {/* Duration */}
                {svc.durationDays && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Clock size={10} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500">{svc.durationDays} days</span>
                  </div>
                )}
                {!svc.durationDays && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle size={10} className="text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Permanent</span>
                  </div>
                )}

                {/* Price & Buy */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/10">
                  <span className="text-lg font-bold text-white">${parseFloat(svc.priceUsd).toFixed(2)}</span>
                  <button
                    onClick={() => handleBuy(svc.id)}
                    disabled={!!buyLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                  >
                    {buyLoading === svc.id ? <RefreshCw size={11} className="animate-spin" /> : <ShoppingCart size={11} />}
                    Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase History */}
      {tab === "history" && (
        <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No purchases yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/10">
              {purchases.map((p: any) => {
                const color = SERVICE_COLORS[p.service?.type] || "#94a3b8";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, color }}>
                      {SERVICE_ICONS[p.service?.type] || <ShoppingCart size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{p.service?.name}</p>
                      <p className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono text-white">${parseFloat(p.amountPaid).toFixed(2)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        p.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-400" :
                        p.status === "PENDING" ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
