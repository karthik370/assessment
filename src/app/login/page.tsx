"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Eye, EyeOff, ChevronRight } from "lucide-react";

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
    { label: "Requester", email: "requester@ptw.dev", name: "Arjun Mehta" },
    { label: "Area Owner", email: "areaowner@ptw.dev", name: "Priya Sundaram" },
    { label: "Safety Officer", email: "safety@ptw.dev", name: "Rajan Pillai" },
    { label: "Admin", email: "admin@ptw.dev", name: "Divya Krishnan" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Background orbs — pure black with subtle depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "600px", height: "600px",
          top: "-200px", left: "50%", transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: "400px", height: "400px",
          bottom: "-100px", right: "-100px",
          background: "radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: "300px", height: "300px",
          bottom: "0", left: "-80px",
          background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Shield icon — liquid glass pill */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }}
            />
            <ShieldCheck className="w-8 h-8 relative z-10" style={{ color: "#94a3b8" }} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Permit to Work</h1>
          <p className="text-xs mt-1.5 tracking-widest font-medium uppercase" style={{ color: "#334155", letterSpacing: "0.2em" }}>
            CMMS Safety Module
          </p>
        </div>

        {/* Login card — liquid glass */}
        <div
          className="rounded-2xl p-7 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Top glass sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 45%)",
              borderRadius: "inherit",
            }}
          />

          <h2 className="text-sm font-semibold mb-5 relative" style={{ color: "#94a3b8" }}>
            Sign in to continue
          </h2>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-5"
              style={{
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.15)",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#f87171" }} />
              <span className="text-sm" style={{ color: "#fca5a5" }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide uppercase" style={{ color: "#475569" }}>
                Email
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
              <label className="block text-xs font-semibold mb-1.5 tracking-wide uppercase" style={{ color: "#475569" }}>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#334155" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm relative overflow-hidden transition-all duration-150"
              style={{
                background: loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                color: loading ? "#475569" : "#e2e8f0",
                boxShadow: loading ? "none" : "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-5">
          <p className="text-center mb-3" style={{ color: "#1e293b", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Demo accounts · all use{" "}
            <code style={{ color: "#334155", fontFamily: "monospace" }}>password123</code>
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
                className="p-3 rounded-xl text-left relative overflow-hidden group transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                }}
              >
                <span className="block text-xs font-bold" style={{ color: "#475569" }}>
                  {acc.label}
                </span>
                <span className="block text-xs mt-0.5 truncate" style={{ color: "#1e293b" }}>
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Version mark */}
        <p className="text-center mt-6" style={{ fontSize: "0.6rem", color: "#0f172a", letterSpacing: "0.1em" }}>
          OPMAINT PTW · v1.0
        </p>
      </div>
    </div>
  );
}
