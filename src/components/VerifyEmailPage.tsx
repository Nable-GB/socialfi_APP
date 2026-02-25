import { useEffect, useState } from "react";
import { authApi } from "../lib/api";
import { CheckCircle, XCircle, RefreshCw, Mail } from "lucide-react";

interface VerifyEmailPageProps {
  token: string;
  onDone: () => void;
}

export function VerifyEmailPage({ token, onDone }: VerifyEmailPageProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(res => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch(err => {
        setStatus("error");
        setMessage(err?.message ?? "Verification failed");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center border border-slate-700/20"
        style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>

        {status === "loading" && (
          <>
            <RefreshCw size={48} className="text-cyan-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying your email...</h2>
            <p className="text-sm text-slate-400">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
              style={{ border: "2px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email Verified! ✅</h2>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <button onClick={onDone}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
              Go to SocialFi →
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4"
              style={{ border: "2px solid rgba(239,68,68,0.3)" }}>
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-slate-400 mb-2">{message}</p>
            <p className="text-xs text-slate-500 mb-6">The link may have expired. Request a new one from Settings.</p>
            <button onClick={onDone}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #64748b, #475569)" }}>
              Back to SocialFi
            </button>
          </>
        )}

        <div className="flex items-center gap-2 justify-center mt-6">
          <Mail size={14} className="text-slate-600" />
          <span className="text-xs text-slate-600">SocialFi Email Verification</span>
        </div>
      </div>
    </div>
  );
}
