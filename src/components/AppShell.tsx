"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, PlusSquare, CheckSquare,
  Settings, LogOut, ChevronDown, User
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "#060f20", borderRight: "1px solid rgba(148,163,184,0.07)" }}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e40af, #7c3aed)" }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">PTW System</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">Permit to Work</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href) && href !== "/";
            return (
              <Link
                key={href}
                href={href}
                id={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "rgba(59,130,246,0.12)" : "transparent",
                  color: active ? "#60a5fa" : "#64748b",
                  borderLeft: active ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Admin link — only for admins */}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: pathname.startsWith("/admin") ? "rgba(59,130,246,0.12)" : "transparent",
                color: pathname.startsWith("/admin") ? "#60a5fa" : "#64748b",
                borderLeft: pathname.startsWith("/admin") ? "2px solid #3b82f6" : "2px solid transparent",
              }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        {/* User info + sign out */}
        <div className="p-3 border-t border-slate-800/50">
          <div className="p-3 rounded-lg" style={{ background: "rgba(30,41,59,0.4)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-900/50 text-blue-400 flex-shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{session?.user?.name}</p>
                <p className="text-xs text-blue-400">{roleLabel[role]}</p>
              </div>
            </div>
            <button
              id="sign-out-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
