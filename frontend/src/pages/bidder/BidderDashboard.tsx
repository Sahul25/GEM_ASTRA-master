import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ArrowRight, FileText, CheckCircle2, Clock } from "lucide-react";
import { bidderMyBids, bidderListOpenTenders, type Bid, type GovTender } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export function BidderDashboard() {
  const { user } = useAuth();
  const [bids, setBids]     = useState<Bid[]>([]);
  const [open, setOpen]     = useState<GovTender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bidderMyBids(), bidderListOpenTenders()])
      .then(([b, o]) => { setBids(b); setOpen(o); })
      .finally(() => setLoading(false));
  }, []);

  const activeBids   = bids.filter(b => b.tender_status === "open").length;
  const awardedBids  = bids.filter(b => b.tender_status === "awarded").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-5 text-white flex items-center gap-4">
        <Briefcase size={28} className="shrink-0 opacity-80" />
        <div>
          <h2 className="text-lg font-semibold">Welcome, {user?.username}</h2>
          <p className="text-sm opacity-80 mt-0.5">
            Browse open government tenders, submit your bids, and track their status here.
          </p>
        </div>
      </div>

      {/* My stats */}
      <section>
        <h2 className="section-label">My bidding activity</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Bids",    value: bids.length,  icon: FileText,     color: "text-blue-600 bg-blue-50 border-blue-200" },
            { label: "Active Bids",   value: activeBids,   icon: Clock,        color: "text-amber-600 bg-amber-50 border-amber-200" },
            { label: "Bids Awarded",  value: awardedBids,  icon: CheckCircle2, color: "text-gem-emerald bg-gem-emerald-soft border-emerald-200" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-gem-muted uppercase tracking-wider">{label}</span>
                <span className={`p-1.5 rounded-lg border ${color}`}><Icon size={14} /></span>
              </div>
              <span className="text-2xl font-semibold text-gem-text">
                {loading ? "—" : value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Open tenders snapshot */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label mb-0">Open tenders</h2>
          <Link to="/bidder/tenders"
            className="text-xs text-gem-emerald hover:text-gem-emerald-hover font-medium flex items-center gap-1 transition-colors">
            View all <ArrowRight size={11} />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gem-muted">Loading…</p>
        ) : open.length === 0 ? (
          <div className="card py-8 text-center text-sm text-gem-muted">
            No open tenders at the moment. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {open.slice(0, 4).map(t => (
              <div key={t.id} className="card hover:shadow-elevated hover:border-emerald-200 transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gem-text leading-snug">
                    {t.title.length > 60 ? t.title.slice(0, 60) + "…" : t.title}
                  </h3>
                  <span className="badge-teal shrink-0">open</span>
                </div>
                <p className="text-xs text-gem-muted mt-1">{t.department}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gem-muted">
                  <span>
                    {t.quantity > 0 ? `${t.quantity} ${t.unit}` : ""}
                    {t.budget_estimate > 0 ? ` · ₹${t.budget_estimate.toLocaleString("en-IN")}` : ""}
                  </span>
                  <span>Deadline: {t.end_date}</span>
                </div>
                <Link to={`/bidder/tenders/${t.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gem-emerald hover:text-gem-emerald-hover transition-colors">
                  View &amp; Bid <ArrowRight size={11} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent bids */}
      {bids.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label mb-0">My recent bids</h2>
            <Link to="/bidder/my-bids"
              className="text-xs text-gem-emerald hover:text-gem-emerald-hover font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gem-border bg-slate-50 text-gem-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Tender</th>
                  <th className="px-4 py-3 text-right font-semibold">My Bid (₹)</th>
                  <th className="px-4 py-3 text-left font-semibold">Tender Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {bids.slice(0, 5).map(b => (
                  <tr key={b.id} className="border-b border-gem-border last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gem-text">
                      {(b.tender_title ?? "").length > 45
                        ? (b.tender_title ?? "").slice(0, 45) + "…"
                        : b.tender_title}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gem-text">
                      ₹{b.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={b.tender_status === "open" ? "badge-teal" :
                        b.tender_status === "awarded" ? "bg-purple-50 text-purple-700 border border-purple-200 badge" :
                        "badge-slate"}>
                        {b.tender_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gem-subtle">
                      {b.submitted_at.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
