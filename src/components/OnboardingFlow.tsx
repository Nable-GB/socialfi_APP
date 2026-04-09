import { useState } from "react";
import { Music, Users, Crown, ArrowRight, X } from "lucide-react";
import { useLang } from "../contexts/LangContext";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const { t } = useLang();

  const steps = [
    {
      id: 1,
      icon: Music,
      color: "#22d3ee",
      gradient: "from-cyan-500/20 to-blue-600/20",
      border: "rgba(34,211,238,0.3)",
      title: t.onboarding.step1Title,
      body: t.onboarding.step1Body,
      highlight: null,
    },
    {
      id: 2,
      icon: Users,
      color: "#a855f7",
      gradient: "from-purple-500/20 to-indigo-600/20",
      border: "rgba(168,85,247,0.3)",
      title: t.onboarding.step2Title,
      body: t.onboarding.step2Body,
      highlight: t.onboarding.step2Highlight,
    },
    {
      id: 3,
      icon: Crown,
      color: "#f59e0b",
      gradient: "from-amber-500/20 to-orange-600/20",
      border: "rgba(245,158,11,0.3)",
      title: t.onboarding.step3Title,
      body: t.onboarding.step3Body,
      highlight: t.onboarding.step3Highlight,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(3,7,17,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm mx-auto">
        {/* Card */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(10,16,32,0.95)", border: `1px solid ${current.border}` }}>
          {/* Icon area */}
          <div className={`bg-gradient-to-br ${current.gradient} flex items-center justify-center p-10`}>
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: `${current.color}18`, border: `1px solid ${current.color}40` }}>
              <current.icon size={44} style={{ color: current.color }} />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((_, i) => (
                <div key={i} className="rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 6,
                    height: 6,
                    background: i === step ? current.color : "rgba(148,163,184,0.2)",
                  }} />
              ))}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">{current.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{current.body}</p>
              {current.highlight && (
                <p className="mt-3 text-xs font-semibold rounded-lg px-3 py-2"
                  style={{ background: `${current.color}10`, border: `1px solid ${current.color}25`, color: current.color }}>
                  {current.highlight}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onComplete}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={13} />
                {t.onboarding.skip}
              </button>
              <button
                onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${current.color}30, ${current.color}15)`,
                  border: `1px solid ${current.color}40`,
                  color: current.color,
                }}
              >
                {isLast ? t.onboarding.getStarted : t.onboarding.next}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
