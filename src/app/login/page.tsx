"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/");
  }

  const demoAccounts = [
    { label: "Requester", email: "requester@ptw.dev", name: "Arjun Mehta", role: "REQUESTER" },
    { label: "Area Owner", email: "areaowner@ptw.dev", name: "Priya Sundaram", role: "AREA_OWNER" },
    { label: "Safety Officer", email: "safety@ptw.dev", name: "Rajan Pillai", role: "SAFETY_OFFICER" },
    { label: "Admin", email: "admin@ptw.dev", name: "Divya Krishnan", role: "ADMIN" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black text-slate-100">
      {/* Background amber ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "800px",
          height: "450px",
          top: "-160px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.02) 50%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: "500px",
          height: "400px",
          bottom: "-100px",
          right: "-100px",
          background: "radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative overflow-hidden group"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.3)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(251,191,36,0.15), inset 0 1px 0 rgba(251,191,36,0.2)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, transparent 60%)",
              }}
            />
            <ShieldCheck className="w-8 h-8 relative z-10" style={{ color: "#fbbf24" }} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Permit to Work</h1>
          <p className="text-xs mt-1 font-medium tracking-widest uppercase text-amber-400/90 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            CMMS Safety Module
          </p>
        </div>

        {/* Liquid Glass Card */}
        <div
          className="rounded-2xl p-7 relative overflow-hidden mb-6"
          style={{
            background: "rgba(18, 18, 18, 0.65)",
            border: "1px solid rgba(251,191,36,0.18)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 24px rgba(251,191,36,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Subtle top sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, transparent 40%)",
            }}
          />

          <h2 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-amber-400/90">
            Sign In to your workspace
          </h2>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-5"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span className="text-xs font-medium text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="name@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer mt-2"
              style={{
                background: loading ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.35)",
                backdropFilter: "blur(8px)",
                color: "#fbbf24",
                boxShadow: "0 4px 20px rgba(251,191,36,0.12), inset 0 1px 0 rgba(251,191,36,0.15)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "rgba(251,191,36,0.22)";
                  e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)";
                  e.currentTarget.style.boxShadow = "0 6px 28px rgba(251,191,36,0.22), inset 0 1px 0 rgba(251,191,36,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "rgba(251,191,36,0.15)";
                  e.currentTarget.style.borderColor = "rgba(251,191,36,0.35)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(251,191,36,0.12), inset 0 1px 0 rgba(251,191,36,0.15)";
                }
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts picker */}
        <div className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <p className="text-center mb-3 text-[0.7rem] text-slate-400 font-medium tracking-wider uppercase">
            Quick Login Demo Accounts <span className="text-amber-400 font-mono">(password123)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                id={`demo-${acc.label.toLowerCase().replace(" ", "-")}`}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("password123");
                }}
                className="p-2.5 rounded-xl text-left transition-all duration-150 relative overflow-hidden group cursor-pointer"
                style={{
                  background: "rgba(251,191,36,0.04)",
                  border: "1px solid rgba(251,191,36,0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(251,191,36,0.1)";
                  e.currentTarget.style.borderColor = "rgba(251,191,36,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(251,191,36,0.04)";
                  e.currentTarget.style.borderColor = "rgba(251,191,36,0.12)";
                }}
              >
                <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-amber-400">
                  {acc.label}
                </span>
                <span className="block text-xs font-medium text-slate-200 mt-0.5 truncate">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center mt-5 text-[0.65rem] text-slate-600 tracking-wider">
          OPMAINT PTW · CMMS High Hazard Safety Module
        </p>
      </div>
    </div>
  );
}
