import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, ShieldAlert,
  TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight, Network,
} from "lucide-react";
import { govGetStats, type GovStats } from "../../lib/api";

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-gem-muted uppercase tracking-wider">{label}</span>
        <span className={`p-1.5 rounded-lg border ${color}`}><Icon size={14} /></span>
      </div>
      <span className="text-2xl font-semibold text-gem-text">{value}</span>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    title: "Post a New Tender",
    body: "Create a procurement request — specify quantity, budget estimate, and deadline.",
    to: "/gov/tenders/new",
    cta: "Create tender",
    icon: FileText,
    accent: "border-blue-200 hover:border-blue-300",
    dot: "bg-blue-500",
  },
  {
    title: "Manage Tenders",
    body: "View all tenders, monitor bid counts, and close or award procurement rounds.",
    to: "/gov/tenders",
    cta: "View tenders",
    icon: Clock,
    accent: "border-emerald-200 hover:border-emerald-300",
    dot: "bg-gem-emerald",
  },
  {
    title: "Bid Analytics",
    body: "Inspect submitted bids per tender, compare amounts, and identify the lowest bidder.",
    to: "/gov/bids",
    cta: "Review bids",
    icon: ShieldAlert,
    accent: "border-amber-200 hover:border-amber-300",
    dot: "bg-amber-500",
  },
  {
    title: "Risk Analysis",
    body: "Run the detection engine — price similarity, co-participation, and winner-rotation signals with full explainability.",
    to: "/gov/risk",
    cta: "Run analysis",
    icon: ShieldAlert,
    accent: "border-red-200 hover:border-red-300",
    dot: "bg-red-500",
  },
  {
    title: "Bidder Network",
    body: "Visualise the co-participation graph — who bids together across tenders. Click nodes to explore connections.",
    to: "/gov/network",
    cta: "View network",
    icon: Network,
    accent: "border-purple-200 hover:border-purple-300",
    dot: "bg-purple-500",
  },
];

export function GovDashboard() {
  const [stats, setStats] = useState<GovStats | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    govGetStats().then(setStats).catch(() => setErr(true));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 text-white flex items-center gap-4">
        <LayoutDashboard size={28} className="shrink-0 opacity-80" />
        <div>
          <h2 className="text-lg font-semibold">Government Officer Portal</h2>
          <p className="text-sm opacity-80 mt-0.5">
            Create tenders, review bids, run risk analysis, and map bidder connections.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <section>
        <h2 className="section-label">Platform overview</h2>
        {err && (
          <p className="text-xs text-red-500 mb-3">Could not load stats — is the API running?</p>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Tenders"
            value={stats?.total_tenders ?? "—"}
            icon={FileText}
            color="text-blue-600 bg-blue-50 border-blue-200"
          />
          <StatCard
            label="Open Tenders"
            value={stats?.open_tenders ?? "—"}
            icon={TrendingUp}
            color="text-gem-emerald bg-gem-emerald-soft border-emerald-200"
          />
          <StatCard
            label="Closed / Awarded"
            value={stats ? stats.closed_tenders + stats.awarded_tenders : "—"}
            icon={CheckCircle2}
            color="text-slate-600 bg-slate-100 border-slate-200"
          />
          <StatCard
            label="Total Bids"
            value={stats?.total_bids ?? "—"}
            icon={ShieldAlert}
            color="text-amber-600 bg-amber-50 border-amber-200"
          />
          <StatCard
            label="Unique Bidders"
            value={stats?.total_bidders ?? "—"}
            icon={Users}
            color="text-purple-600 bg-purple-50 border-purple-200"
          />
          <StatCard
            label="Cancelled"
            value={
              stats
                ? stats.total_tenders -
                  stats.open_tenders -
                  stats.closed_tenders -
                  stats.awarded_tenders
                : "—"
            }
            icon={XCircle}
            color="text-red-500 bg-red-50 border-red-200"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="section-label">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(({ title, body, to, cta, icon: Icon, accent, dot }) => (
            <div
              key={to}
              className={`card hover:shadow-elevated transition-all duration-150 ${accent}`}
            >
              <div className={`w-2 h-2 rounded-full ${dot} mb-3`} />
              <h3 className="text-sm font-semibold text-gem-text mb-2">{title}</h3>
              <p className="text-xs text-gem-muted leading-relaxed mb-4">{body}</p>
              <Link
                to={to}
                className="inline-flex items-center gap-1 text-xs font-medium text-gem-emerald hover:text-gem-emerald-hover transition-colors"
              >
                {cta} <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
