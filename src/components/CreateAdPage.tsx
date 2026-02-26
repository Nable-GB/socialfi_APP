import { useState, useEffect } from "react";
import { Zap, Target, Globe, FileText, ArrowRight, CheckCircle, Sparkles, RefreshCw, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import { adsApi } from "../lib/api";
import type { ApiAdPackage } from "../lib/api";
export function CreateAdPage() {
  const [packages, setPackages] = useState<ApiAdPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ title: string; id: string } | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [postContent, setPostContent] = useState("");

  // Targeting
  const [targetInterests, setTargetInterests] = useState<string[]>([]);
  const [targetLocation, setTargetLocation] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [targetAgeMin, setTargetAgeMin] = useState("");
  const [targetAgeMax, setTargetAgeMax] = useState("");
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await adsApi.getPackages();
      setPackages(res.packages);
    } catch {
      // If no packages from API, use fallback demo data
      setPackages([
        { id: "demo-1", name: "Starter", description: "Perfect for testing the waters", priceFiat: "49", priceCrypto: "0.02", impressions: 5000, durationDays: 7, totalRewardPool: "50" },
        { id: "demo-2", name: "Growth", description: "Reach a wider audience", priceFiat: "199", priceCrypto: "0.08", impressions: 25000, durationDays: 14, totalRewardPool: "200" },
        { id: "demo-3", name: "Pro", description: "Maximum exposure & engagement", priceFiat: "499", priceCrypto: "0.20", impressions: 100000, durationDays: 30, totalRewardPool: "500" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!selectedPkg || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const res = await adsApi.createCampaign({
        adPackageId: selectedPkg,
        campaignTitle: title,
        campaignDescription: description || undefined,
        targetUrl: targetUrl || undefined,
        content: postContent || undefined,
        targetInterests: targetInterests.length > 0 ? targetInterests : undefined,
        targetLocation: targetLocation || undefined,
        targetGender: targetGender || undefined,
        targetAgeMin: targetAgeMin ? parseInt(targetAgeMin) : undefined,
        targetAgeMax: targetAgeMax ? parseInt(targetAgeMax) : undefined,
      });
      toast.success(res.message);
      setCreated({ title: res.campaign.title, id: res.campaign.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPkg(null);
    setTitle("");
    setDescription("");
    setTargetUrl("");
    setPostContent("");
    setTargetInterests([]);
    setTargetLocation("");
    setTargetGender("");
    setTargetAgeMin("");
    setTargetAgeMax("");
    setInterestInput("");
    setCreated(null);
  };

  const selectedPackage = packages.find(p => p.id === selectedPkg);

  const tierColors: Record<string, { bg: string; border: string; accent: string; icon: string }> = {
    "Starter": { bg: "from-slate-800 to-slate-900", border: "border-cyan-500/30", accent: "#22d3ee", icon: "🚀" },
    "Growth": { bg: "from-indigo-900/50 to-slate-900", border: "border-indigo-500/30", accent: "#818cf8", icon: "📈" },
    "Pro": { bg: "from-amber-900/30 to-slate-900", border: "border-amber-500/30", accent: "#f59e0b", icon: "👑" },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-6 border border-slate-700/10"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(34,211,238,0.05))" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Create Ad Campaign</h1>
            <p className="text-xs text-slate-400">Reach 50K+ Web3 users with sponsored posts</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mt-5">
          {[
            { n: 1, label: "Choose Package" },
            { n: 2, label: "Campaign Details" },
            { n: 3, label: "Review & Pay" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n
                ? "bg-indigo-500 text-white"
                : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                {step > s.n ? <CheckCircle size={14} /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.n ? "text-white" : "text-slate-500"}`}>{s.label}</span>
              {i < 2 && <div className={`flex-1 h-px ${step > s.n ? "bg-indigo-500" : "bg-slate-700/50"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Choose Package */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" /> Select Your Package
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading packages...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map(pkg => {
                const colors = tierColors[pkg.name] ?? tierColors["Starter"];
                const isSelected = selectedPkg === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    className={`rounded-2xl p-5 text-left transition-all border-2 ${isSelected
                      ? `${colors.border} ring-2 ring-offset-2 ring-offset-slate-900`
                      : "border-slate-700/20 hover:border-slate-600/40"
                      } bg-gradient-to-br ${colors.bg}`}
                    style={isSelected ? { boxShadow: `0 0 0 2px ${colors.accent}` } : {}}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{colors.icon}</span>
                      {pkg.name === "Pro" && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{pkg.description}</p>

                    <div className="mt-4 pt-4 border-t border-slate-700/20">
                      <p className="text-2xl font-bold font-mono" style={{ color: colors.accent }}>
                        ${parseFloat(pkg.priceFiat).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">or {pkg.priceCrypto} ETH</p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        `${pkg.impressions.toLocaleString()} impressions`,
                        `${pkg.durationDays} days duration`,
                        `${parseFloat(pkg.totalRewardPool).toLocaleString()} token reward pool`,
                      ].map(feature => (
                        <div key={feature} className="flex items-center gap-2">
                          <CheckCircle size={12} style={{ color: colors.accent }} />
                          <span className="text-xs text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => { if (selectedPkg) setStep(2); else toast.error("Select a package first"); }}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Campaign Details */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-indigo-400" /> Campaign Details
          </h2>

          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Campaign Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Launch Week Special — 50% off minting"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your campaign — what makes it special?"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Globe size={13} className="inline mr-1" /> Target URL
              </label>
              <input
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://your-project.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Sponsored Post Content</label>
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Write the post that will appear in users' feeds (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
          </div>

          {/* Audience Targeting */}
          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={14} className="text-cyan-400" /> Audience Targeting
              <span className="text-[10px] text-slate-500 font-normal ml-1">(optional — leave blank for all users)</span>
            </h3>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Interests</label>
              <div className="flex gap-2">
                <input
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && interestInput.trim()) {
                      e.preventDefault();
                      if (!targetInterests.includes(interestInput.trim().toLowerCase())) {
                        setTargetInterests([...targetInterests, interestInput.trim().toLowerCase()]);
                      }
                      setInterestInput("");
                    }
                  }}
                  placeholder="Type interest & press Enter (e.g. defi, gaming, nft)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              {targetInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {targetInterests.map(i => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center gap-1">
                      {i}
                      <button onClick={() => setTargetInterests(targetInterests.filter(x => x !== i))} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Location + Gender + Age */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Location</label>
                <input
                  value={targetLocation}
                  onChange={e => setTargetLocation(e.target.value)}
                  placeholder="e.g. Thailand"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                <select
                  value={targetGender}
                  onChange={e => setTargetGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Age Range</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    value={targetAgeMin}
                    onChange={e => setTargetAgeMin(e.target.value)}
                    placeholder="18"
                    type="number"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-slate-600 text-xs">–</span>
                  <input
                    value={targetAgeMax}
                    onChange={e => setTargetAgeMax(e.target.value)}
                    placeholder="65"
                    type="number"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700/30 hover:bg-slate-800/50 transition-all">
              Back
            </button>
            <button
              onClick={() => { if (title.trim()) setStep(3); else toast.error("Campaign title is required"); }}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
              Review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {created && (
        <div className="glass rounded-2xl p-8 border border-emerald-500/20 text-center" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.05))" }}>
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-white mb-2">Campaign Created!</h2>
          <p className="text-sm text-slate-400 mb-1">Your campaign <strong className="text-white">"{created.title}"</strong> is now active.</p>
          <p className="text-xs text-slate-500 font-mono mb-6">ID: {created.id}</p>
          {postContent && (
            <div className="glass rounded-xl p-4 border border-slate-700/10 mb-6 text-left">
              <p className="text-xs text-slate-500 mb-1">Sponsored Post</p>
              <p className="text-sm text-slate-300">{postContent}</p>
            </div>
          )}
          <button onClick={resetForm}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
            Create Another Campaign
          </button>
        </div>
      )}

      {/* Step 3: Review & Launch */}
      {step === 3 && selectedPackage && !created && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target size={18} className="text-indigo-400" /> Review & Launch
          </h2>

          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
              <span className="text-sm text-slate-400">Package</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Crown size={13} className="text-indigo-400" /> {selectedPackage.name}
              </span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
              <span className="text-sm text-slate-400">Campaign Title</span>
              <span className="text-sm font-semibold text-white">{title}</span>
            </div>
            {description && (
              <div className="pb-3 border-b border-slate-700/20">
                <span className="text-sm text-slate-400 block mb-1">Description</span>
                <span className="text-sm text-slate-300">{description}</span>
              </div>
            )}
            {targetUrl && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
                <span className="text-sm text-slate-400">Target URL</span>
                <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline flex items-center gap-1">
                  {targetUrl.replace(/^https?:\/\//, '').slice(0, 30)} <Globe size={12} />
                </a>
              </div>
            )}
            {postContent && (
              <div className="pb-3 border-b border-slate-700/20">
                <span className="text-sm text-slate-400 block mb-1">Sponsored Post</span>
                <span className="text-sm text-slate-300">{postContent}</span>
              </div>
            )}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
              <span className="text-sm text-slate-400">Impressions</span>
              <span className="text-sm font-mono text-white">{selectedPackage.impressions.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
              <span className="text-sm text-slate-400">Duration</span>
              <span className="text-sm font-mono text-white">{selectedPackage.durationDays} days</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
              <span className="text-sm text-slate-400">Reward Pool</span>
              <span className="text-sm font-mono text-amber-400">{parseFloat(selectedPackage.totalRewardPool).toLocaleString()} tokens</span>
            </div>
            {/* Targeting summary */}
            {(targetInterests.length > 0 || targetLocation || targetGender || targetAgeMin || targetAgeMax) && (
              <div className="pb-3 border-b border-slate-700/20">
                <span className="text-sm text-slate-400 block mb-2">Audience Targeting</span>
                <div className="flex flex-wrap gap-1.5">
                  {targetInterests.map(i => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 text-cyan-400">{i}</span>
                  ))}
                  {targetLocation && <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/15 text-indigo-400">{targetLocation}</span>}
                  {targetGender && <span className="px-2 py-0.5 rounded-full text-[10px] bg-pink-500/15 text-pink-400">{targetGender}</span>}
                  {(targetAgeMin || targetAgeMax) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-400">Age {targetAgeMin || '?'}–{targetAgeMax || '?'}</span>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-bold text-white">Total</span>
              <span className="text-xl font-bold font-mono text-indigo-400">
                ${parseFloat(selectedPackage.priceFiat).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700/30 hover:bg-slate-800/50 transition-all">
              Back
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={submitting}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
              {submitting ? <><RefreshCw size={15} className="animate-spin" /> Creating...</> : <><Zap size={16} /> Launch Campaign</>}
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4">How Sponsored Posts Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Choose & Pay", desc: "Select a package and complete payment via Stripe or crypto", icon: "💳" },
            { step: "2", title: "Create Content", desc: "Your sponsored post appears in users' feeds with your branding", icon: "📝" },
            { step: "3", title: "Earn Engagement", desc: "Users earn tokens for viewing — you get real, incentivized reach", icon: "🎯" },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
