import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileSearch, ClipboardList, Info, HardHat } from "lucide-react";
import { cn } from "../../lib/cn";

const nav = [
  { to: "/bidder",          label: "Dashboard",       icon: LayoutDashboard, end: true },
  { to: "/bidder/tenders",  label: "Open Tenders",    icon: FileSearch },
  { to: "/bidder/my-bids",  label: "My Bids",         icon: ClipboardList },
  { to: "/bidder/about",    label: "About",           icon: Info },
];

export function BidderSidebar() {
  return (
    <aside className="flex flex-col w-60 shrink-0 bg-gem-card border-r border-gem-border min-h-screen shadow-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gem-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gem-emerald-soft border border-emerald-200">
          <HardHat size={16} className="text-gem-emerald" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gem-text leading-tight">GeM Astra</div>
          <div className="text-[10px] text-gem-subtle uppercase tracking-widest leading-tight mt-0.5">
            Bidder Portal
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gem-subtle uppercase tracking-widest">
          My Activity
        </p>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn("nav-item", isActive && "active")}>
            <Icon size={15} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gem-border pt-3">
        <p className="px-3 text-[10px] text-gem-subtle">GeM Astra v0.1 · Bidder Portal</p>
      </div>
    </aside>
  );
}
