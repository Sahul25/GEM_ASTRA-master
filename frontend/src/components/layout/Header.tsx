import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileSearch,
  ShieldAlert,
  Network,
  ClipboardList,
  Info,
  LogOut,
  UserCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_META: Record<string, { title: string; icon: LucideIcon; sub: string }> = {
  "/":        { title: "Overview",              icon: LayoutDashboard, sub: "Platform summary" },
  "/tenders": { title: "Tender Explorer",       icon: FileSearch,      sub: "Browse and import tender records" },
  "/risk":    { title: "Risk Analysis",         icon: ShieldAlert,     sub: "Detection findings and review priorities" },
  "/network": { title: "Bidder Network",        icon: Network,         sub: "Relationship graph explorer" },
  "/reports": { title: "Investigation Reports", icon: ClipboardList,   sub: "Document and export findings" },
  "/about":   { title: "About",                 icon: Info,            sub: "Purpose, limitations, and human-review requirement" },
};

export function Header({ actions }: { actions?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const meta = PAGE_META[pathname] ?? PAGE_META["/"];
  const Icon = meta.icon;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gem-border bg-gem-card sticky top-0 z-10 shadow-card">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gem-emerald shrink-0" />
        <div>
          <h1 className="text-base font-semibold text-gem-text leading-tight">{meta.title}</h1>
          <p className="text-xs text-gem-muted leading-tight mt-0.5">{meta.sub}</p>
        </div>
      </div>

      {/* Right side — custom actions + user info */}
      <div className="flex items-center gap-3">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gem-border">
            {/* User pill */}
            <div className="flex items-center gap-1.5 text-xs text-gem-muted">
              <UserCircle2 size={14} className="shrink-0" />
              <span className="font-medium text-gem-text capitalize">{user.username}</span>
              <span className="badge-slate text-[10px]">{user.role}</span>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                         text-gem-muted hover:text-red-600 hover:bg-red-50
                         border border-transparent hover:border-red-200
                         transition-colors duration-150"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
