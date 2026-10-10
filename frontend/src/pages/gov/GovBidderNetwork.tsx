import { useEffect, useState, useRef, useCallback } from "react";
import { Network, Info, RefreshCw, X } from "lucide-react";
import { govGetBidderNetwork, type GovNetworkData, type NetworkNode, type NetworkEdge } from "../../lib/api";

// ── Layout helpers ─────────────────────────────────────────────────────────

interface NodePos { id: string; x: number; y: number; tenderCount: number }

/** Simple circular layout; use force simulation if many nodes. */
function circularLayout(nodes: NetworkNode[], w: number, h: number): NodePos[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ id: nodes[0].bidder_id, x: w / 2, y: h / 2, tenderCount: nodes[0].tender_count }];
  }
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.38;
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return { id: n.bidder_id, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), tenderCount: n.tender_count };
  });
}

function nodeRadius(tenderCount: number) {
  return Math.max(16, Math.min(32, 12 + tenderCount * 3));
}

function edgeStrokeWidth(sharedCount: number) {
  return Math.max(1.5, Math.min(7, sharedCount * 1.5));
}

// ── Selected node panel ────────────────────────────────────────────────────

function NodeDetail({
  nodeId, nodes, edges, onClose,
}: {
  nodeId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onClose: () => void;
}) {
  const node = nodes.find(n => n.bidder_id === nodeId);
  const connectedEdges = edges.filter(e => e.bidder_a === nodeId || e.bidder_b === nodeId);
  const connectedBidders = connectedEdges.map(e =>
    e.bidder_a === nodeId ? e.bidder_b : e.bidder_a
  );

  return (
    <div className="absolute top-3 right-3 w-72 bg-white rounded-xl border border-gem-border shadow-elevated z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gem-border">
        <h4 className="text-sm font-semibold text-gem-text truncate">{nodeId}</h4>
        <button onClick={onClose} className="text-gem-subtle hover:text-gem-text transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 border border-gem-border px-2.5 py-2">
            <p className="text-[10px] text-gem-subtle uppercase tracking-wide">Tenders</p>
            <p className="font-semibold text-gem-text">{node?.tender_count ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-gem-border px-2.5 py-2">
            <p className="text-[10px] text-gem-subtle uppercase tracking-wide">Co-bidders</p>
            <p className="font-semibold text-gem-text">{connectedBidders.length}</p>
          </div>
        </div>

        {connectedEdges.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gem-subtle uppercase tracking-wider">Shared tender connections</p>
            {connectedEdges.map((e, i) => {
              const partner = e.bidder_a === nodeId ? e.bidder_b : e.bidder_a;
              return (
                <div key={i} className="rounded-lg bg-slate-50 border border-gem-border px-2.5 py-2 text-xs">
                  <p className="font-medium text-gem-text">{partner}</p>
                  <p className="text-gem-subtle text-[10px]">
                    {e.shared_tender_count} shared tender{e.shared_tender_count !== 1 ? "s" : ""}
                  </p>
                  <p className="text-gem-subtle text-[10px] mt-0.5 truncate">
                    {e.shared_tenders.map(t => t.tender_title).join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-600 leading-relaxed">
            Connections show shared participation only — not evidence of coordination.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function GovBidderNetwork() {
  const [data, setData]       = useState<GovNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 720, H = 480;

  async function load() {
    setLoading(true); setError(null); setSelected(null);
    try { setData(await govGetBidderNetwork()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load network."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const positions = data ? circularLayout(data.nodes, W, H) : [];
  const posMap: Record<string, NodePos> = {};
  positions.forEach(p => { posMap[p.id] = p; });

  const handleNodeClick = useCallback((id: string) => {
    setSelected(s => s === id ? null : id);
  }, []);

  const highlightEdge = (e: NetworkEdge) =>
    selected && (e.bidder_a === selected || e.bidder_b === selected);

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gem-text flex items-center gap-2">
            <Network size={16} className="text-blue-500" /> Bidder Co-participation Graph
          </h2>
          <p className="text-xs text-gem-muted mt-0.5">
            Nodes = bidder accounts · Edges = shared tender participation · Edge thickness = shared count
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gem-border text-gem-muted hover:bg-slate-50 transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Co-participation graph —</strong> {data?.disclaimer ??
            "Shared participation is a review signal only. It is NOT evidence of coordination, collusion, or fraud."}
        </p>
      </div>

      {loading && (
        <div className="card py-16 text-center text-sm text-gem-muted">Building network graph…</div>
      )}

      {error && (
        <div className="card flex items-center gap-2 text-red-600 text-sm">
          <Info size={16} />{error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats row */}
          <div className="flex gap-4 text-xs text-gem-muted">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
              {data.total_bidders} bidder{data.total_bidders !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-gem-border inline-block" />
              {data.total_edges} connection{data.total_edges !== 1 ? "s" : ""}
            </span>
            {selected && (
              <span className="text-blue-600 font-medium">
                Selected: {selected} — click to deselect
              </span>
            )}
          </div>

          {data.nodes.length === 0 ? (
            <div className="card py-14 text-center space-y-2">
              <p className="text-sm text-gem-muted">No bidder connections yet.</p>
              <p className="text-xs text-gem-subtle">
                Connections appear once multiple bidders have submitted bids on the same tender.
              </p>
            </div>
          ) : (
            /* SVG graph */
            <div className="card p-0 overflow-hidden relative">
              <svg
                ref={svgRef}
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                className="bg-white"
                aria-label="Bidder co-participation graph"
              >
                {/* Edges */}
                {data.edges.map((e, i) => {
                  const a = posMap[e.bidder_a], b = posMap[e.bidder_b];
                  if (!a || !b) return null;
                  const hi = highlightEdge(e);
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      strokeWidth={edgeStrokeWidth(e.shared_tender_count)}
                      stroke={hi ? "#3B82F6" : "#CBD5E1"}
                      strokeOpacity={selected && !hi ? 0.2 : 0.8}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* Edge weight labels */}
                {data.edges.map((e, i) => {
                  const a = posMap[e.bidder_a], b = posMap[e.bidder_b];
                  if (!a || !b || e.shared_tender_count < 2) return null;
                  const hi = highlightEdge(e);
                  return (
                    <text
                      key={`lbl-${i}`}
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={hi ? "#3B82F6" : "#94A3B8"}
                      opacity={selected && !hi ? 0.15 : 1}
                    >
                      {e.shared_tender_count}
                    </text>
                  );
                })}

                {/* Nodes */}
                {positions.map(p => {
                  const r = nodeRadius(p.tenderCount);
                  const isSel = selected === p.id;
                  const isConnected = selected
                    ? data.edges.some(e =>
                        (e.bidder_a === selected && e.bidder_b === p.id) ||
                        (e.bidder_b === selected && e.bidder_a === p.id)
                      )
                    : false;
                  const dimmed = selected && !isSel && !isConnected;

                  return (
                    <g
                      key={p.id}
                      onClick={() => handleNodeClick(p.id)}
                      className="cursor-pointer"
                      opacity={dimmed ? 0.2 : 1}
                      style={{ transition: "opacity 0.2s" }}
                    >
                      {/* Glow ring when selected */}
                      {isSel && (
                        <circle cx={p.x} cy={p.y} r={r + 6}
                          fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeOpacity="0.5" />
                      )}
                      <circle
                        cx={p.x} cy={p.y} r={r}
                        fill={isSel ? "#3B82F6" : isConnected ? "#93C5FD" : "#BFDBFE"}
                        stroke={isSel ? "#1D4ED8" : "#93C5FD"}
                        strokeWidth={isSel ? 2 : 1.5}
                      />
                      <text
                        x={p.x} y={p.y}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize="10" fontWeight="600"
                        fill={isSel ? "white" : "#1E40AF"}
                      >
                        {p.id.length > 8 ? p.id.slice(0, 8) + "…" : p.id}
                      </text>
                      {/* Tender count badge */}
                      <text
                        x={p.x + r - 4} y={p.y - r + 4}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize="8" fill="#64748B"
                      >
                        {p.tenderCount}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Node detail panel */}
              {selected && (
                <NodeDetail
                  nodeId={selected}
                  nodes={data.nodes}
                  edges={data.edges}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-[11px] text-gem-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
              Node size ∝ tender count
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-slate-300 inline-block" />
              Thin edge = 1 shared tender
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-1 bg-slate-400 inline-block rounded" />
              Thick edge = multiple shared tenders
            </span>
            <span>Click a node to see its connections</span>
          </div>

          {/* Edge table */}
          {data.edges.length > 0 && (
            <details className="card p-0 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-xs font-medium text-gem-muted hover:text-gem-text transition-colors">
                Show all connections ({data.edges.length})
              </summary>
              <table className="w-full text-xs border-t border-gem-border">
                <thead>
                  <tr className="bg-slate-50 text-gem-muted uppercase tracking-wide text-[10px]">
                    <th className="px-5 py-2.5 text-left font-semibold">Bidder A</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Bidder B</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Shared Tenders</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Tender Titles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.edges.map((e, i) => (
                    <tr key={i} className="border-t border-gem-border hover:bg-slate-50">
                      <td className="px-5 py-2.5 font-medium text-gem-text">{e.bidder_a}</td>
                      <td className="px-5 py-2.5 font-medium text-gem-text">{e.bidder_b}</td>
                      <td className="px-5 py-2.5 text-gem-muted">{e.shared_tender_count}</td>
                      <td className="px-5 py-2.5 text-gem-subtle text-[10px]">
                        {e.shared_tenders.map(t => t.tender_title).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </div>
  );
}
