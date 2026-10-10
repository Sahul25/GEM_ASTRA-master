import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, ShieldAlert, Network, Info, Building2 } from "lucide-react";
import { cn } from "../../lib/cn";

const nav = [
  { to: "/gov",         label: "Dashboard",       icon: LayoutDashboard, end: true },
  { to: "/gov/tenders", label: "Manage Tenders",  icon: FileText },
  { to: "/gov/bids",    label: "Bid Analytics",   icon: FileText },
  { to: "/gov/risk",    label: "Risk Analysis",   icon: ShieldAlert },
  { to: "/gov/network", label: "Bidder Network",  icon: Network },
  { to: "/gov/about",   label: "About",           icon: Info },
];

export function GovSidebar() {
  return (
    <aside className="flex flex-col w-60 shrink-0 bg-gem-card border-r border-gem-border min-h-screen shadow-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gem-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 border border-blue-200">
          <Building2 size={16} className="text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gem-text leading-tight">GeM Astra</div>
          <div className="text-[10px] text-gem-subtle uppercase tracking-widest leading-tight mt-0.5">
            Government Portal
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gem-subtle uppercase tracking-widest">
          Procurement
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
        <NavLink to="/gov/tenders/new"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <FileText size={13} /> Post New Tender
        </NavLink>
        <p className="px-3 mt-3 text-[10px] text-gem-subtle">GeM Astra v0.1 · Government</p>
      </div>
    </aside>
  );
}
