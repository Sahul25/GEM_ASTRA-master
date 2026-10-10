import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, IndianRupee, ArrowRight, AlertCircle } from "lucide-react";
import { bidderListOpenTenders, bidderSubmitBid, bidderMyBids, type GovTender, type Bid } from "../../lib/api";

export function OpenTenders() {
  const navigate = useNavigate();
  const [tenders, setTenders]   = useState<GovTender[]>([]);
  const [myBids, setMyBids]     = useState<Bid[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [bidModal, setBidModal] = useState<GovTender | null>(null);
  const [amount, setAmount]     = useState("");
  const [note, setNote]         = useState("");
  const [bidErr, setBidErr]     = useState<string | null>(null);
  const [bidOk, setBidOk]       = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [t, b] = await Promise.all([bidderListOpenTenders({ search }), bidderMyBids()]);
      setTenders(t); setMyBids(b);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search]); // eslint-disable-line

  function myBidForTender(id: number) {
    return myBids.find(b => b.tender_id === id);
  }

  function openBidModal(t: GovTender) {
    const existing = myBidForTender(t.id);
    setBidModal(t);
    setAmount(existing ? String(existing.amount) : "");
    setNote(existing ? existing.note : "");
    setBidErr(null); setBidOk(null);
  }

  async function submitBid() {
    if (!bidModal) return;
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setBidErr("Please enter a valid bid amount greater than zero."); return;
    }
    setBidErr(null); setSubmitting(true);
    try {
      await bidderSubmitBid(bidModal.id, amt, note);
      setBidOk(bidModal.id);
      await load();
      setTimeout(() => { setBidModal(null); setBidOk(null); }, 1200);
    } catch (e) {
      setBidErr(e instanceof Error ? e.message : "Bid failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gem-text">Open Tenders</h2>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gem-subtle" />
          <input className="input pl-8 text-xs w-56" placeholder="Search tenders…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card py-12 text-center text-sm text-gem-muted">Loading tenders…</div>
      ) : tenders.length === 0 ? (
        <div className="card py-12 text-center text-sm text-gem-muted">
          No open tenders at the moment.
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map(t => {
            const existing = myBidForTender(t.id);
            return (
              <div key={t.id} className="card hover:shadow-elevated hover:border-emerald-200 transition-all duration-150">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gem-text">{t.title}</h3>
                    <p className="text-xs text-gem-muted mt-0.5">{t.department} · {t.category || "General"}</p>
                    {t.description && (
                      <p className="text-xs text-gem-muted mt-1.5 leading-relaxed line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gem-muted">
                      {t.quantity > 0 && (
                        <span>{t.quantity} {t.unit}</span>
                      )}
                      {t.budget_estimate > 0 && (
                        <span className="flex items-center gap-1">
                          <IndianRupee size={11} /> Budget: ₹{t.budget_estimate.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> Deadline: {t.end_date}
                      </span>
                      <span>{t.bid_count} bid{t.bid_count !== 1 ? "s" : ""} submitted</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {existing ? (
                      <>
                        <div className="text-right">
                          <p className="text-[10px] text-gem-subtle uppercase tracking-wide">Your bid</p>
                          <p className="text-sm font-semibold text-gem-emerald font-mono">
                            ₹{existing.amount.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <button onClick={() => openBidModal(t)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gem-emerald text-gem-emerald hover:bg-gem-emerald-nav transition-colors font-medium">
                          Update Bid
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openBidModal(t)}
                        className="btn-primary text-xs flex items-center gap-1.5">
                        Submit Bid <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bid modal */}
      {bidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gem-text">
                {myBidForTender(bidModal.id) ? "Update Your Bid" : "Submit a Bid"}
              </h3>
              <p className="text-xs text-gem-muted mt-0.5 line-clamp-2">{bidModal.title}</p>
            </div>

            {bidModal.budget_estimate > 0 && (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-gem-border text-xs text-gem-muted">
                Government budget estimate: <span className="font-semibold text-gem-text">
                  ₹{bidModal.budget_estimate.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {bidErr && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{bidErr}</p>
              </div>
            )}

            {bidOk && (
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-gem-emerald-text font-medium">
                ✓ Bid submitted successfully!
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gem-text">
                Your Bid Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input className="input font-mono" type="number" min="1" placeholder="e.g. 2000000"
                value={amount} onChange={e => setAmount(e.target.value)} disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gem-text">Note (optional)</label>
              <textarea className="input resize-none text-xs" rows={2}
                placeholder="Delivery timeline, conditions, remarks…"
                value={note} onChange={e => setNote(e.target.value)} disabled={submitting} />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={submitBid} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-xs">
                {submitting ? (
                  <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Submitting…</>
                ) : (
                  myBidForTender(bidModal.id) ? "Update Bid" : "Submit Bid"
                )}
              </button>
              <button onClick={() => setBidModal(null)} disabled={submitting}
                className="px-4 py-2 rounded-lg border border-gem-border text-xs text-gem-muted hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
