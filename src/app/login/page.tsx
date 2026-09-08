"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

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

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
  }

  const demoAccounts = [
    { label: "Requester", email: "requester@ptw.dev", role: "Arjun Mehta" },
    { label: "Area Owner", email: "areaowner@ptw.dev", role: "Priya Sundaram" },
    { label: "Safety Officer", email: "safety@ptw.dev", role: "Rajan Pillai" },
    { label: "Admin", email: "admin@ptw.dev", role: "Divya Krishnan" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(30,58,138,0.3) 0%, transparent 60%), #020617" }}>
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #1e40af, #7c3aed)" }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Permit to Work</h1>
          <p className="text-slate-400 text-sm mt-1">CMMS Safety Module</p>
        </div>

        {/* Login card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to continue</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6">
          <p className="text-xs text-slate-500 text-center mb-3">Demo accounts — all use <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded">password123</code></p>
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
                className="p-3 rounded-lg text-left transition-colors"
                style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.08)"; }}
              >
                <span className="block text-xs font-semibold text-blue-400">{acc.label}</span>
                <span className="block text-xs text-slate-400 mt-0.5 truncate">{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
