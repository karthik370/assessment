"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, PlusSquare, CheckSquare,
  Settings, LogOut, User
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/permits/new", label: "New Permit", icon: PlusSquare },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role ?? "";

  const roleLabel: Record<string, string> = {
    REQUESTER: "Requester",
    AREA_OWNER: "Area Owner",
    SAFETY_OFFICER: "Safety Officer",
    ADMIN: "Administrator",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000" }}>
      {/* Sidebar — liquid glass panel */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col relative"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        {/* Subtle top-left glass sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, transparent 40%)",
            borderRadius: "inherit",
          }}
        />

        {/* Logo */}
        <div
          className="p-5 relative"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <ShieldCheck className="w-4 h-4 relative z-10" style={{ color: "#64748b" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">PTW System</p>
              <p className="text-xs leading-none mt-0.5" style={{ color: "#1e293b" }}>Permit to Work</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href) && href !== "/";
            return (
              <Link
                key={href}
                href={href}
                id={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden"
                style={{
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  color: active ? "#e2e8f0" : "#334155",
                  border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  backdropFilter: active ? "blur(8px)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "#64748b";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#334155";
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ background: "#94a3b8" }}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}

          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden"
              style={{
                background: pathname.startsWith("/admin") ? "rgba(255,255,255,0.06)" : "transparent",
                color: pathname.startsWith("/admin") ? "#e2e8f0" : "#334155",
                border: pathname.startsWith("/admin") ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith("/admin")) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "#64748b";
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith("/admin")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#334155";
                }
              }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        {/* User + sign out */}
        <div
          className="p-3 relative"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div
            className="p-3 rounded-xl relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <User className="w-3.5 h-3.5" style={{ color: "#475569" }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{session?.user?.name}</p>
                <p className="text-xs" style={{ color: "#334155" }}>{roleLabel[role]}</p>
              </div>
            </div>
            <button
              id="sign-out-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-xs transition-colors w-full"
              style={{ color: "#1e293b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#1e293b")}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ background: "#000" }}>
        {children}
      </main>
    </div>
  );
}
