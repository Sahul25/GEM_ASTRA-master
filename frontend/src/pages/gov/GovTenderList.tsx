import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, PlusCircle, ChevronRight, Users, Calendar } from "lucide-react";
import { govListTenders, govUpdateStatus, type GovTender } from "../../lib/api";
import { cn } from "../../lib/cn";

const STATUS_COLORS: Record<string, string> = {
  open:      "badge-teal",
  closed:    "badge-slate",
  awarded:   "bg-purple-50 text-purple-700 border border-purple-200 badge",
  cancelled: "badge-red",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={STATUS_COLORS[status] ?? "badge-slate"}>{status}</span>;
}

export function GovTenderList() {
  const [tenders, setTenders] = useState<GovTender[]>([]);
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await govListTenders({ search, status: statusF || undefined });
      setTenders(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, statusF]); // eslint-disable-line

  async function changeStatus(id: number, newStatus: string) {
    setUpdating(id);
    try {
      const updated = await govUpdateStatus(id, newStatus);
      setTenders(ts => ts.map(t => t.id === id ? updated : t));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gem-text">All Tenders</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gem-subtle" />
            <input className="input pl-8 text-xs w-48" placeholder="Search tenders…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select text-xs w-36" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="awarded">Awarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Link to="/gov/tenders/new" className="btn-primary flex items-center gap-1.5 text-xs">
            <PlusCircle size={13} /> New Tender
          </Link>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gem-muted text-sm">
          Loading tenders…
        </div>
      ) : tenders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-14 gap-3">
          <p className="text-sm text-gem-muted">No tenders found.</p>
          <Link to="/gov/tenders/new" className="btn-primary text-xs flex items-center gap-1.5">
            <PlusCircle size={13} /> Post your first tender
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gem-border bg-slate-50 text-gem-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Tender</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Budget (₹)</th>
                <th className="px-4 py-3 text-left font-semibold">Deadline</th>
                <th className="px-4 py-3 text-left font-semibold">Bids</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((t, i) => (
                <tr key={t.id}
                  className={cn("border-b border-gem-border last:border-0 hover:bg-slate-50 transition-colors",
                    i % 2 === 0 ? "" : "bg-slate-50/50")}>
                  <td className="px-4 py-3">
                    <Link to={`/gov/tenders/${t.id}`}
                      className="font-medium text-gem-text hover:text-gem-emerald transition-colors flex items-center gap-1">
                      {t.title.length > 50 ? t.title.slice(0, 50) + "…" : t.title}
                      <ChevronRight size={11} className="text-gem-subtle" />
                    </Link>
                    {t.category && <span className="text-gem-subtle">{t.category}</span>}
                  </td>
                  <td className="px-4 py-3 text-gem-muted">{t.department}</td>
                  <td className="px-4 py-3 text-gem-text font-mono">
                    {t.budget_estimate > 0 ? `₹${t.budget_estimate.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gem-muted">
                      <Calendar size={11} />{t.end_date}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gem-muted">
                      <Users size={11} />{t.bid_count}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <select
                      className="text-[11px] border border-gem-border rounded px-1.5 py-1 bg-white text-gem-muted cursor-pointer"
                      value={t.status}
                      disabled={updating === t.id}
                      onChange={e => changeStatus(t.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="awarded">Awarded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
