"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  PlusSquare,
  CheckSquare,
  Settings,
  LogOut,
  User,
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
    <div className="flex h-screen overflow-hidden bg-black text-slate-100">
      {/* Sidebar — liquid dark glass panel with amber accenting */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col relative z-20"
        style={{
          background: "rgba(10, 10, 10, 0.75)",
          borderRight: "1px solid rgba(251,191,36,0.12)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.6)",
        }}
      >
        {/* Subtle top-left glass sheen with gentle amber hue */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(160deg, rgba(251,191,36,0.03) 0%, rgba(255,255,255,0.02) 20%, transparent 50%)",
          }}
        />

        {/* Logo / Brand */}
        <div
          className="p-5 relative"
          style={{ borderBottom: "1px solid rgba(251,191,36,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                boxShadow: "0 0 20px rgba(251,191,36,0.15), inset 0 1px 0 rgba(251,191,36,0.2)",
              }}
            >
              <ShieldCheck className="w-5 h-5 relative z-10" style={{ color: "#fbbf24" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide">PTW System</p>
              <p className="text-[0.7rem] font-medium tracking-wider uppercase text-amber-400/80">
                Permit to Work
              </p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href) && href !== "/";
            return (
              <Link
                key={href}
                href={href}
                id={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden"
                style={{
                  background: active ? "rgba(251,191,36,0.1)" : "transparent",
                  color: active ? "#fbbf24" : "#94a3b8",
                  border: active
                    ? "1px solid rgba(251,191,36,0.28)"
                    : "1px solid transparent",
                  boxShadow: active
                    ? "0 4px 16px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.15)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(251,191,36,0.05)";
                    e.currentTarget.style.color = "#fde68a";
                    e.currentTarget.style.border = "1px solid rgba(251,191,36,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.border = "1px solid transparent";
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{
                      background: "#fbbf24",
                      boxShadow: "0 0 10px rgba(251,191,36,0.7)",
                    }}
                  />
                )}
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: active ? "#fbbf24" : "currentColor" }}
                />
                <span>{label}</span>
              </Link>
            );
          })}

          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden"
              style={{
                background: pathname.startsWith("/admin")
                  ? "rgba(251,191,36,0.1)"
                  : "transparent",
                color: pathname.startsWith("/admin") ? "#fbbf24" : "#94a3b8",
                border: pathname.startsWith("/admin")
                  ? "1px solid rgba(251,191,36,0.28)"
                  : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith("/admin")) {
                  e.currentTarget.style.background = "rgba(251,191,36,0.05)";
                  e.currentTarget.style.color = "#fde68a";
                  e.currentTarget.style.border = "1px solid rgba(251,191,36,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith("/admin")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                  e.currentTarget.style.border = "1px solid transparent";
                }
              }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* User profile + sign out footer */}
        <div
          className="p-3 relative"
          style={{ borderTop: "1px solid rgba(251,191,36,0.1)" }}
        >
          <div
            className="p-3 rounded-xl relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(251,191,36,0.15)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.25)",
                }}
              >
                <User className="w-4 h-4" style={{ color: "#fbbf24" }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-[0.68rem] font-medium text-amber-400/90 truncate">
                  {roleLabel[role] ?? role}
                </p>
              </div>
            </div>
            <button
              id="sign-out-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full cursor-pointer pt-1 border-t border-white/[0.04]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content container */}
      <main className="flex-1 overflow-y-auto relative z-10 bg-black">
        {/* Subtle page background amber ambient gradient */}
        <div
          className="fixed pointer-events-none top-0 right-1/4 w-[700px] h-[350px]"
          style={{
            background: "radial-gradient(ellipse, rgba(251,191,36,0.035) 0%, transparent 70%)",
            filter: "blur(50px)",
            zIndex: 0,
          }}
        />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
