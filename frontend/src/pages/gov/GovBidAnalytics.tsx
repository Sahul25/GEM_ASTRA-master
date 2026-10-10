import { useEffect, useState } from "react";
import { govListTenders, govGetBids, type GovTender, type Bid } from "../../lib/api";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

export function GovBidAnalytics() {
  const [tenders, setTenders] = useState<GovTender[]>([]);
  const [bidsMap, setBidsMap] = useState<Record<number, Bid[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    govListTenders().then(ts => {
      setTenders(ts);
      setLoading(false);
    });
  }, []);

  async function toggleExpand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!bidsMap[id]) {
      const bids = await govGetBids(id);
      setBidsMap(m => ({ ...m, [id]: bids }));
    }
  }

  if (loading) return <div className="card py-12 text-center text-sm text-gem-muted">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h2 className="text-base font-semibold text-gem-text">Bid Analytics</h2>
      <p className="text-xs text-gem-muted">Click on a tender to expand its bid details.</p>

      {tenders.length === 0 ? (
        <div className="card py-12 text-center text-sm text-gem-muted">No tenders yet.</div>
      ) : (
        <div className="space-y-2">
          {tenders.map(t => {
            const isOpen = expanded === t.id;
            const bids = bidsMap[t.id] ?? [];
            const lowest = bids.length > 0 ? Math.min(...bids.map(b => b.amount)) : null;
            return (
              <div key={t.id} className="card p-0 overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => toggleExpand(t.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gem-text truncate">{t.title}</p>
                    <p className="text-xs text-gem-muted">{t.department} · {t.category || "General"}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-xs text-gem-muted">
                    <span className="flex items-center gap-1"><Users size={12} />{t.bid_count} bids</span>
                    {lowest !== null && (
                      <span className="font-semibold text-gem-emerald font-mono">
                        Low: ₹{lowest.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className={`badge ${t.status === "open" ? "badge-teal" : "badge-slate"}`}>{t.status}</span>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {/* Bids table */}
                {isOpen && (
                  <div className="border-t border-gem-border">
                    {bids.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-gem-muted">No bids submitted yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-gem-muted uppercase tracking-wide text-[10px]">
                            <th className="px-5 py-2.5 text-left font-semibold">#</th>
                            <th className="px-5 py-2.5 text-left font-semibold">Bidder</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Amount (₹)</th>
                            <th className="px-5 py-2.5 text-left font-semibold">Note</th>
                            <th className="px-5 py-2.5 text-left font-semibold">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bids.map((b, i) => (
                            <tr key={b.id} className="border-t border-gem-border hover:bg-slate-50">
                              <td className="px-5 py-2.5 text-gem-subtle">{i + 1}</td>
                              <td className="px-5 py-2.5 font-medium text-gem-text">{b.username}</td>
                              <td className={`px-5 py-2.5 text-right font-mono font-semibold ${b.amount === lowest ? "text-gem-emerald" : "text-gem-text"}`}>
                                ₹{b.amount.toLocaleString("en-IN")}
                                {b.amount === lowest && <span className="ml-1 badge-teal text-[9px]">Lowest</span>}
                              </td>
                              <td className="px-5 py-2.5 text-gem-muted">{b.note || "—"}</td>
                              <td className="px-5 py-2.5 text-gem-subtle">{b.submitted_at.slice(0, 16).replace("T", " ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
