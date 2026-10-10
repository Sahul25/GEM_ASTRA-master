import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bidderMyBids, type Bid } from "../../lib/api";

export function MyBids() {
  const [bids, setBids]     = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bidderMyBids().then(setBids).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card py-12 text-center text-sm text-gem-muted">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-base font-semibold text-gem-text">My Bid History</h2>

      {bids.length === 0 ? (
        <div className="card py-12 text-center space-y-3">
          <p className="text-sm text-gem-muted">You haven't submitted any bids yet.</p>
          <Link to="/bidder/tenders" className="btn-primary text-xs inline-flex">
            Browse open tenders
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gem-border bg-slate-50 text-gem-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Tender</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-right font-semibold">My Bid (₹)</th>
                <th className="px-4 py-3 text-right font-semibold">Budget Est.</th>
                <th className="px-4 py-3 text-left font-semibold">Tender Status</th>
                <th className="px-4 py-3 text-left font-semibold">Deadline</th>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(b => (
                <tr key={b.id} className="border-b border-gem-border last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gem-text max-w-[200px]">
                    <span className="line-clamp-2">{b.tender_title}</span>
                    {b.note && <p className="text-gem-subtle font-normal mt-0.5 truncate">{b.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-gem-muted">{b.department}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gem-text">
                    ₹{b.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gem-muted">
                    {b.budget_estimate ? `₹${b.budget_estimate.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      b.tender_status === "open"     ? "badge-teal" :
                      b.tender_status === "awarded"  ? "bg-purple-50 text-purple-700 border border-purple-200 badge" :
                      b.tender_status === "cancelled"? "badge-red" : "badge-slate"
                    }>
                      {b.tender_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gem-muted">{b.end_date}</td>
                  <td className="px-4 py-3 text-gem-subtle">{b.submitted_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
