/**
 * GovRiskAnalysis.tsx
 * Risk Analysis dashboard — powered by Apache ECharts.
 *
 * Charts included
 * ───────────────
 * 1. Gauge          — review-priority score (0–100)
 * 2. Horizontal bar — rule weight vs earned contribution
 * 3. Bar chart      — bid amounts per flagged tender (Rule A)
 * 4. Heatmap        — co-participation matrix (Rule B)
 * 5. Radar          — per-bidder risk profile across rules
 * 6. Bar chart      — flags per bidder (sorted desc)
 *
 * DISCLAIMER
 * ──────────
 * All scores are review-priority indicators only.
 * They are NOT probabilities of collusion or fraud.
 * Expert human review is required before any action.
 */

import { useEffect, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { ShieldAlert, AlertCircle, Info, CheckCircle2, RefreshCw } from "lucide-react";
import { govGetRiskAnalysis, type RiskResult, type RiskFinding } from "../../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BAND_META: Record<string, { color: string; light: string; text: string; bg: string; border: string }> = {
  Low:      { color: "#22c55e", light: "#dcfce7", text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  Moderate: { color: "#f59e0b", light: "#fef3c7", text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  Elevated: { color: "#f97316", light: "#ffedd5", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  High:     { color: "#ef4444", light: "#fee2e2", text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
};

const RULE_COLOR: Record<string, string> = {
  A: "#f97316", B: "#8b5cf6", C: "#ef4444", D: "#94a3b8",
};

const RULE_LABEL: Record<string, string> = {
  A: "Price Similarity",
  B: "Co-participation",
  C: "Winner Rotation",
  D: "Participation Anomaly",
};

const CHART_OPTS = { renderer: "svg" as const };

// ─────────────────────────────────────────────────────────────────────────────
// 1. Score Gauge
// ─────────────────────────────────────────────────────────────────────────────

function ScoreGauge({ score, band }: { score: number; band: string }) {
  const meta = BAND_META[band] ?? BAND_META.Low;

  const option = {
    animation: true,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0, max: 100,
        radius: "88%",
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.25, "#22c55e"],
              [0.50, "#f59e0b"],
              [0.75, "#f97316"],
              [1.00, "#ef4444"],
            ],
          },
        },
        pointer: { length: "65%", width: 5, itemStyle: { color: meta.color } },
        axisTick:    { distance: -22, length: 6,  lineStyle: { color: "#fff", width: 1.5 } },
        splitLine:   { distance: -26, length: 12, lineStyle: { color: "#fff", width: 2 } },
        axisLabel: {
          color: "#64748b", fontSize: 11, distance: -36,
          formatter: (v: number) => v === 0 ? "Low" : v === 25 ? "" : v === 50 ? "Mod" : v === 75 ? "" : "High",
        },
        detail: {
          valueAnimation: true, fontSize: 34, fontWeight: "bold",
          color: meta.color, offsetCenter: [0, "28%"],
          formatter: (v: number) => `${v}`,
        },
        title: { offsetCenter: [0, "52%"], fontSize: 12, color: "#94a3b8" },
        data: [{ value: score, name: "/ 100 Priority" }],
      },
    ],
  };

  return (
    <div className="card flex flex-col items-center gap-1">
      <div className="w-full" style={{ height: 220 }}>
        <ReactECharts option={option} opts={CHART_OPTS} style={{ height: "100%", width: "100%" }} />
      </div>
      <span className={`badge border text-sm font-bold px-4 py-1 ${meta.bg} ${meta.text} ${meta.border}`}>
        {band}
      </span>
      <p className="text-[10px] text-gem-subtle text-center mt-1 leading-relaxed">
        Review-priority score only.<br />Not a probability of collusion.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rule Contribution Bar
// ─────────────────────────────────────────────────────────────────────────────

function RuleContributionChart({ result }: { result: RiskResult }) {
  const rules = [
    { rule: "A", weight: 35 },
    { rule: "B", weight: 25 },
    { rule: "C", weight: 40 },
  ];

  const active = new Set(result.findings.filter(f => !f.insufficient_data).map(f => f.rule));

  // Parse earned scores from explanation string
  const earned: Record<string, number> = {};
  const expl = result.score_explanation ?? "";
  [["A", /Rule A[^:]*:\s*(\d+)/], ["B", /Rule B[^:]*:\s*(\d+)/], ["C", /Rule C[^:]*:\s*(\d+)/]]
    .forEach(([r, re]) => {
      const m = expl.match(re as RegExp);
      if (m) earned[r as string] = parseInt(m[1]);
    });

  const categories = rules.map(r => `Rule ${r.rule}\n${RULE_LABEL[r.rule]}`);

  const option = {
    animation: true,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown[]) => {
        const p = params as Array<{ seriesName: string; value: number; color: string }>;
        return p.map(x => `<span style="color:${x.color}">●</span> ${x.seriesName}: <b>${x.value}</b>`).join("<br/>");
      },
    },
    legend: {
      data: ["Max weight", "Earned (this run)"],
      bottom: 0, textStyle: { fontSize: 11, color: "#64748b" },
    },
    grid: { top: 10, bottom: 50, left: 90, right: 20 },
    xAxis: { type: "value", max: 40, axisLabel: { fontSize: 11, color: "#64748b" },
      splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } } },
    yAxis: {
      type: "category", data: categories,
      axisLabel: { fontSize: 10, color: "#64748b", lineHeight: 16 },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Max weight",
        type: "bar",
        barMaxWidth: 18,
        data: rules.map(r => ({
          value: r.weight,
          itemStyle: { color: active.has(r.rule) ? RULE_COLOR[r.rule] + "30" : "#e2e8f0", borderRadius: 4 },
        })),
        label: { show: true, position: "right", formatter: (p: { value: number }) => `${p.value}`, fontSize: 10, color: "#94a3b8" },
      },
      {
        name: "Earned (this run)",
        type: "bar",
        barMaxWidth: 18,
        barGap: "-100%",
        data: rules.map(r => ({
          value: earned[r.rule] ?? 0,
          itemStyle: { color: active.has(r.rule) ? RULE_COLOR[r.rule] : "#e2e8f0", borderRadius: 4 },
        })),
        label: { show: true, position: "right", formatter: (p: { value: number }) => p.value > 0 ? `${p.value}` : "", fontSize: 11, fontWeight: "bold", color: "#1e293b" },
      },
    ],
  };

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gem-text mb-2">Rule weight contributions</p>
      <ReactECharts option={option} opts={CHART_OPTS} style={{ height: 180 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Bid Price Grouped Bar (Rule A — per-tender comparison)
// ─────────────────────────────────────────────────────────────────────────────

function BidPriceGroupedBar({ findings }: { findings: RiskFinding[] }) {
  const aFindings = findings.filter(f => f.rule === "A" && !f.insufficient_data);
  if (aFindings.length === 0) return null;

  // Collect all bidders and tender groups
  const allBidders = new Set<string>();
  const tenderData: Array<{ tender: string; bids: Record<string, number> }> = [];

  aFindings.forEach(f => {
    const pairs = (f.evidence?.pairs as Array<{
      bidder_a: string; bidder_b: string; bid_a: number; bid_b: number
    }>) ?? [];
    const bids: Record<string, number> = {};
    pairs.forEach(p => {
      bids[p.bidder_a] = p.bid_a;
      bids[p.bidder_b] = p.bid_b;
      allBidders.add(p.bidder_a);
      allBidders.add(p.bidder_b);
    });
    tenderData.push({ tender: `Tender #${f.tender_ids[0] ?? "?"}`, bids });
  });

  const bidders = Array.from(allBidders);
  const colors  = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#06b6d4"];

  const series = bidders.map((bidder, i) => ({
    name: bidder,
    type: "bar" as const,
    barMaxWidth: 32,
    itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 0, 0] },
    label: {
      show: true, position: "top" as const,
      formatter: (p: { value: number }) => p.value > 0 ? `₹${(p.value / 1000).toFixed(0)}k` : "",
      fontSize: 10, color: "#64748b",
    },
    data: tenderData.map(t => t.bids[bidder] ?? 0),
  }));

  const option = {
    animation: true,
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown[]) => {
        const p = params as Array<{ seriesName: string; value: number; color: string }>;
        const lines = p.filter(x => x.value > 0)
          .map(x => `<span style="color:${x.color}">●</span> ${x.seriesName}: <b>₹${x.value.toLocaleString("en-IN")}</b>`);
        return lines.join("<br/>");
      },
    },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: "#64748b" } },
    grid: { top: 20, bottom: 55, left: 60, right: 20 },
    xAxis: {
      type: "category",
      data: tenderData.map(t => t.tender),
      axisLabel: { fontSize: 11, color: "#64748b" },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => `₹${(v / 1000).toFixed(0)}k`, fontSize: 10, color: "#64748b" },
      splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } },
    },
    series,
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RULE_COLOR.A }} />
        <p className="text-xs font-semibold text-gem-text">Rule A — Bid amount comparison (flagged tenders)</p>
      </div>
      <ReactECharts option={option} opts={CHART_OPTS} style={{ height: 240 }} />
      <p className="text-[10px] text-gem-subtle mt-1">
        Groups show all bidders per flagged tender. Similar bar heights indicate unusually close bids.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Co-participation Heatmap (Rule B)
// ─────────────────────────────────────────────────────────────────────────────

function CoParticipationHeatmap({ findings }: { findings: RiskFinding[] }) {
  const bFindings = findings.filter(f => f.rule === "B" && !f.insufficient_data);
  if (bFindings.length === 0) return null;

  const bidderSet = new Set<string>();
  bFindings.forEach(f => f.bidder_ids.forEach(b => bidderSet.add(b)));
  const bidders = Array.from(bidderSet).slice(0, 12);

  // Build value array for heatmap: [colIdx, rowIdx, value]
  const pairMap: Record<string, number> = {};
  bFindings.forEach(f => {
    const [a, b] = f.bidder_ids;
    if (a && b) {
      const cnt = (f.evidence?.co_participation_count as number) ?? 1;
      pairMap[`${a}||${b}`] = cnt;
      pairMap[`${b}||${a}`] = cnt;
    }
  });

  const data: [number, number, number][] = [];
  bidders.forEach((row, ri) => {
    bidders.forEach((col, ci) => {
      if (ri === ci) { data.push([ci, ri, -1]); return; }
      const v = pairMap[`${row}||${col}`] ?? 0;
      data.push([ci, ri, v]);
    });
  });

  const maxVal = Math.max(1, ...bFindings.map(f => (f.evidence?.co_participation_count as number) ?? 1));

  const option = {
    animation: true,
    tooltip: {
      formatter: (p: { data: [number, number, number] }) => {
        const [ci, ri, v] = p.data;
        if (v < 0) return "";
        return `${bidders[ri]} ↔ ${bidders[ci]}: <b>${v} shared tender${v !== 1 ? "s" : ""}</b>`;
      },
    },
    grid: { top: 20, bottom: 10, left: 90, right: 20 },
    xAxis: {
      type: "category",
      data: bidders.map(b => b.length > 8 ? b.slice(0, 8) + "…" : b),
      position: "top",
      axisLabel: { rotate: 35, fontSize: 10, color: "#64748b" },
      axisTick: { show: false }, axisLine: { show: false },
      splitArea: { show: true, areaStyle: { color: ["#f8fafc", "#f1f5f9"] } },
    },
    yAxis: {
      type: "category",
      data: bidders.map(b => b.length > 8 ? b.slice(0, 8) + "…" : b),
      axisLabel: { fontSize: 10, color: "#64748b" },
      axisTick: { show: false }, axisLine: { show: false },
      splitArea: { show: true, areaStyle: { color: ["#f8fafc", "#f1f5f9"] } },
    },
    visualMap: {
      min: 0, max: maxVal,
      calculable: true, orient: "horizontal",
      left: "center", bottom: -10, show: false,
      inRange: { color: ["#ede9fe", "#7c3aed"] },
      outOfRange: { color: "#f1f5f9" },
    },
    series: [{
      type: "heatmap",
      data: data.filter(d => d[2] >= 0),
      label: {
        show: true,
        formatter: (p: { data: [number, number, number] }) => p.data[2] > 0 ? `${p.data[2]}` : "·",
        fontSize: 10, fontWeight: "bold", color: "#4c1d95",
      },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(139,92,246,0.4)" } },
    }],
  };

  const h = Math.max(220, bidders.length * 34 + 60);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RULE_COLOR.B }} />
        <p className="text-xs font-semibold text-gem-text">Rule B — Co-participation heat map</p>
      </div>
      <ReactECharts option={option} opts={CHART_OPTS} style={{ height: h }} />
      <p className="text-[10px] text-gem-subtle mt-1">
        Darker cell = more shared tenders between two bidders. Diagonal = self (excluded).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Bidder Flag Count Bar (sorted)
// ─────────────────────────────────────────────────────────────────────────────

function BidderFlagBar({ findings }: { findings: RiskFinding[] }) {
  const active = findings.filter(f => !f.insufficient_data);
  if (active.length === 0) return null;

  const counts: Record<string, { total: number; rules: Set<string> }> = {};
  active.forEach(f => {
    f.bidder_ids.forEach(b => {
      if (!counts[b]) counts[b] = { total: 0, rules: new Set() };
      counts[b].total++;
      counts[b].rules.add(f.rule);
    });
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12);

  if (sorted.length === 0) return null;

  const bidderNames = sorted.map(([b]) => b.length > 12 ? b.slice(0, 12) + "…" : b);
  const ruleSets    = ["A", "B", "C"];

  const series = ruleSets.map(r => ({
    name: `Rule ${r}`,
    type: "bar" as const,
    stack: "flags",
    barMaxWidth: 36,
    itemStyle: {
      color: RULE_COLOR[r] + "cc",
      borderRadius: r === "C" ? [4, 4, 0, 0] : 0,
    },
    data: sorted.map(([, v]) => v.rules.has(r) ? 1 : 0),
  }));

  const option = {
    animation: true,
    tooltip: {
      trigger: "axis", axisPointer: { type: "shadow" },
      formatter: (params: unknown[]) => {
        const p = params as Array<{ seriesName: string; value: number; color: string; axisValue: string }>;
        const name = p[0]?.axisValue ?? "";
        const lines = p.filter(x => x.value > 0)
          .map(x => `<span style="color:${x.color}">●</span> ${x.seriesName}`);
        return `<b>${name}</b><br/>${lines.join("<br/>") || "No flags"}`;
      },
    },
    legend: {
      data: ruleSets.map(r => `Rule ${r}`), bottom: 0,
      textStyle: { fontSize: 11, color: "#64748b" },
    },
    grid: { top: 10, bottom: 50, left: 100, right: 20 },
    xAxis: {
      type: "value", name: "Flags", nameTextStyle: { fontSize: 10, color: "#94a3b8" },
      axisLabel: { fontSize: 11, color: "#64748b" },
      splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } },
    },
    yAxis: {
      type: "category", data: bidderNames,
      axisLabel: { fontSize: 10, color: "#64748b" },
      axisTick: { show: false },
    },
    series,
  };

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gem-text mb-1">Flagged bidders — signal count by rule</p>
      <p className="text-[10px] text-gem-subtle mb-2">
        Multiple rule flags across the same bidder increases review priority. Not an indicator of guilt.
      </p>
      <ReactECharts option={option} opts={CHART_OPTS} style={{ height: Math.max(180, sorted.length * 30 + 70) }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Radar — multi-bidder risk profile
// ─────────────────────────────────────────────────────────────────────────────

function BidderRadar({ findings }: { findings: RiskFinding[] }) {
  const active = findings.filter(f => !f.insufficient_data);
  if (active.length === 0) return null;

  // Build per-bidder scores across dimensions
  const bidderRules: Record<string, Record<string, number>> = {};
  active.forEach(f => {
    f.bidder_ids.forEach(b => {
      if (!bidderRules[b]) bidderRules[b] = { A: 0, B: 0, C: 0 };
      bidderRules[b][f.rule] = (bidderRules[b][f.rule] ?? 0) + 1;
    });
  });

  const topBidders = Object.entries(bidderRules)
    .map(([b, r]) => ({ b, total: Object.values(r).reduce((s, v) => s + v, 0), r }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  if (topBidders.length === 0) return null;

  const radarColors = ["#ef4444", "#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

  const option = {
    animation: true,
    tooltip: {},
    legend: {
      data: topBidders.map(x => x.b),
      bottom: 0,
      textStyle: { fontSize: 10, color: "#64748b" },
    },
    radar: {
      shape: "polygon",
      indicator: [
        { name: "Price Similarity (A)", max: 5 },
        { name: "Co-participation (B)", max: 5 },
        { name: "Winner Rotation (C)", max: 5 },
      ],
      splitArea: { areaStyle: { color: ["#f8fafc", "#f1f5f9", "#e8edf5"] } },
      axisName: { fontSize: 10, color: "#64748b" },
    },
    series: [{
      type: "radar" as const,
      data: topBidders.map((x, i) => ({
        value: [x.r.A ?? 0, x.r.B ?? 0, x.r.C ?? 0],
        name: x.b,
        lineStyle: { color: radarColors[i % radarColors.length], width: 2 },
        areaStyle: { color: radarColors[i % radarColors.length], opacity: 0.08 },
        symbol: "circle", symbolSize: 5,
        itemStyle: { color: radarColors[i % radarColors.length] },
      })),
    }],
  };

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gem-text mb-1">Bidder risk profile — radar</p>
      <p className="text-[10px] text-gem-subtle mb-2">
        Each axis = number of rule signals for that bidder. Larger polygon = more signals across more rules.
      </p>
      <ReactECharts option={option} opts={CHART_OPTS} style={{ height: 280 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding card — compact, no raw JSON
// ─────────────────────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: RiskFinding }) {
  const [open, setOpen]     = useState(true);
  const [note, setNote]     = useState("");
  const [reviewed, setDone] = useState(false);
  const c = RULE_COLOR[finding.rule] ?? "#94a3b8";

  return (
    <div className={`rounded-xl border overflow-hidden ${finding.insufficient_data ? "opacity-55" : ""}`}
      style={{ borderColor: finding.insufficient_data ? "#e2e8f0" : c + "40" }}>

      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors text-left">
        <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: c }}>
          {finding.rule}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gem-text">{finding.rule_name}</p>
          <p className="text-xs text-gem-muted mt-0.5">
            {finding.insufficient_data
              ? "Unavailable — insufficient data (score unchanged)"
              : `${finding.tender_ids.length} tender${finding.tender_ids.length !== 1 ? "s" : ""} · ${finding.bidder_ids.length} bidder${finding.bidder_ids.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {reviewed && <CheckCircle2 size={13} className="text-gem-emerald" />}
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
            style={{ background: finding.insufficient_data ? "#94a3b8" : c }}>
            {finding.insufficient_data ? "N/A" : "Signal"}
          </span>
          <span className="text-gem-subtle text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t bg-slate-50/60 px-5 py-4 space-y-4"
          style={{ borderColor: c + "25" }}>

          {finding.explanation && (
            <p className="text-xs text-gem-text leading-relaxed">{finding.explanation}</p>
          )}

          {!finding.insufficient_data && (
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white rounded-lg border border-gem-border px-3 py-2.5">
                <p className="text-[9px] text-gem-subtle uppercase tracking-wider font-semibold mb-1">Threshold</p>
                <p className="text-gem-text">{finding.threshold_or_criterion}</p>
              </div>
              <div className="bg-white rounded-lg border border-gem-border px-3 py-2.5">
                <p className="text-[9px] text-gem-subtle uppercase tracking-wider font-semibold mb-1">Source</p>
                <p className="font-mono text-gem-text">{finding.source_type}</p>
              </div>
              {finding.tender_ids.length > 0 && (
                <div className="bg-white rounded-lg border border-gem-border px-3 py-2.5 col-span-2">
                  <p className="text-[9px] text-gem-subtle uppercase tracking-wider font-semibold mb-1">
                    Tenders involved
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {finding.tender_ids.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">#{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {finding.bidder_ids.length > 0 && (
                <div className="bg-white rounded-lg border border-gem-border px-3 py-2.5 col-span-2">
                  <p className="text-[9px] text-gem-subtle uppercase tracking-wider font-semibold mb-1">
                    Bidders involved
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {finding.bidder_ids.map(b => (
                      <span key={b} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: c + "15", color: c, border: `1px solid ${c}30` }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {finding.data_limitations && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
              <Info size={11} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed">{finding.data_limitations}</p>
            </div>
          )}

          {!finding.insufficient_data && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Possible legitimate explanation: competitive pricing, industry specialisation,
                long-term relationships, or coincidental overlap — none of these imply wrongdoing.
              </p>
            </div>
          )}

          {!finding.insufficient_data && (
            <div className="space-y-2 pt-1 border-t border-gem-border">
              <p className="text-[10px] text-gem-subtle font-semibold uppercase tracking-wider">Reviewer notes</p>
              <textarea className="input resize-none text-xs" rows={2}
                placeholder="Record your review decision or reasons for dismissal…"
                value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={() => setDone(true)} className="btn-primary text-xs flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                {reviewed ? "Review updated" : "Mark as reviewed"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function GovRiskAnalysis() {
  const [result, setResult]   = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResult(await govGetRiskAnalysis()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to run analysis."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const actionable  = result?.findings.filter(f => !f.insufficient_data) ?? [];
  const unavailable = result?.findings.filter(f => f.insufficient_data) ?? [];
  const band        = result?.score_band ?? "Low";
  const bMeta       = BAND_META[band] ?? BAND_META.Low;

  return (
    <div className="max-w-5xl mx-auto space-y-7">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gem-text flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500" /> Risk Analysis
          </h2>
          <p className="text-xs text-gem-muted mt-0.5">
            Analytical signals for authorised reviewers. Not a determination of wrongdoing.
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gem-border text-gem-muted hover:bg-slate-50 transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Rerun analysis
        </button>
      </div>

      {loading && (
        <div className="card py-16 text-center space-y-3">
          <RefreshCw size={22} className="animate-spin text-gem-muted mx-auto" />
          <p className="text-sm text-gem-muted">Running analysis…</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* ── Row 1: Gauge + Rule weights ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ScoreGauge score={result.score} band={band} />
            <div className="space-y-4">
              <RuleContributionChart result={result} />
              {/* Data stats */}
              <div className="card grid grid-cols-4 gap-3 text-center py-3">
                {[
                  { label: "Bids",      val: result.total_bids_analysed },
                  { label: "Tenders",   val: result.total_tenders_analysed },
                  { label: "Signals",   val: actionable.length },
                  { label: "N/A",       val: unavailable.length },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-lg font-bold text-gem-text">{val}</p>
                    <p className="text-[10px] text-gem-muted uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer banner */}
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${bMeta.bg} ${bMeta.border}`}>
            <AlertCircle size={14} className={`${bMeta.text} shrink-0 mt-0.5`} />
            <p className={`text-xs leading-relaxed ${bMeta.text}`}>
              <strong>Prototype weights — not calibrated probabilities.</strong>{" "}
              {result.score_explanation}
            </p>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Charts section ── */}
          {actionable.length > 0 && (
            <>
              <h3 className="section-label">Visualisations</h3>

              {/* Bid price bars + Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <BidPriceGroupedBar findings={actionable} />
                <CoParticipationHeatmap findings={actionable} />
              </div>

              {/* Bidder flag bar + Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <BidderFlagBar findings={actionable} />
                <BidderRadar findings={actionable} />
              </div>
            </>
          )}

          {/* ── Finding cards ── */}
          <section className="space-y-3">
            <h3 className="section-label">Active signals ({actionable.length})</h3>
            {actionable.length === 0 ? (
              <div className="card py-8 text-center">
                <CheckCircle2 size={20} className="text-gem-emerald mx-auto mb-2" />
                <p className="text-sm text-gem-muted">No active signals in current bid data.</p>
              </div>
            ) : (
              actionable.map((f, i) => <FindingCard key={`${f.rule}-${i}`} finding={f} />)
            )}
          </section>

          {unavailable.length > 0 && (
            <section className="space-y-3">
              <h3 className="section-label text-slate-400">
                Unavailable signals ({unavailable.length}) — missing data, score unchanged
              </h3>
              {unavailable.map((f, i) => <FindingCard key={`unav-${i}`} finding={f} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
