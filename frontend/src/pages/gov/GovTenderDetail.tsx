import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, TrendingDown, AlertCircle } from "lucide-react";
import { govGetTender, govGetBids, govUpdateStatus, type GovTender, type Bid } from "../../lib/api";

export function GovTenderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<GovTender | null>(null);
  const [bids, setBids]     = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([govGetTender(Number(id)), govGetBids(Number(id))])
      .then(([t, b]) => { setTender(t); setBids(b); })
      .catch(() => setError("Failed to load tender."))
      .finally(() => setLoading(false));
  }, [id]);

  async function changeStatus(s: string) {
    if (!tender) return;
    setUpdating(true);
    try {
      const updated = await govUpdateStatus(tender.id, s);
      setTender(updated);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="card py-12 text-center text-sm text-gem-muted">Loading…</div>;
  if (error || !tender) return (
    <div className="card flex items-center gap-2 text-red-600 text-sm">
      <AlertCircle size={16} />{error ?? "Tender not found."}
    </div>
  );

  const lowestBid = bids.length > 0 ? Math.min(...bids.map(b => b.amount)) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <button onClick={() => navigate("/gov/tenders")}
        className="flex items-center gap-1.5 text-xs text-gem-muted hover:text-gem-text transition-colors">
        <ArrowLeft size={13} /> Back to Tenders
      </button>

      {/* Header */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gem-text">{tender.title}</h2>
            <p className="text-xs text-gem-muted mt-1">{tender.department} · {tender.category || "Uncategorised"}</p>
          </div>
          <select
            className="text-xs border border-gem-border rounded-lg px-2.5 py-1.5 bg-white text-gem-text cursor-pointer"
            value={tender.status} disabled={updating}
            onChange={e => changeStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="awarded">Awarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {tender.description && (
          <p className="text-xs text-gem-muted leading-relaxed border-t border-gem-border pt-3">
            {tender.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gem-border pt-3">
          {[
            { label: "Quantity",         value: tender.quantity > 0 ? `${tender.quantity} ${tender.unit}` : "—" },
            { label: "Budget Estimate",  value: tender.budget_estimate > 0 ? `₹${tender.budget_estimate.toLocaleString("en-IN")}` : "—" },
            { label: "Start Date",       value: tender.start_date },
            { label: "Bid Deadline",     value: tender.end_date },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-gem-subtle uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-gem-text mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bids */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gem-muted uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} /> Submitted Bids ({bids.length})
          </h3>
          {lowestBid !== null && (
            <span className="flex items-center gap-1 text-xs text-gem-emerald font-medium">
              <TrendingDown size={13} /> Lowest: ₹{lowestBid.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {bids.length === 0 ? (
          <div className="card py-8 text-center text-sm text-gem-muted">No bids yet.</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gem-border bg-slate-50 text-gem-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Bidder</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, i) => (
                  <tr key={b.id} className="border-b border-gem-border last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-gem-subtle">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gem-text">{b.username}</td>
                    <td className="px-4 py-3 text-gem-muted">{b.email}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${b.amount === lowestBid ? "text-gem-emerald" : "text-gem-text"}`}>
                      ₹{b.amount.toLocaleString("en-IN")}
                      {b.amount === lowestBid && <span className="ml-1 text-[9px] badge-teal">Lowest</span>}
                    </td>
                    <td className="px-4 py-3 text-gem-muted">{b.note || "—"}</td>
                    <td className="px-4 py-3 text-gem-subtle">{b.submitted_at.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
