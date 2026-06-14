import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";

import { TRUCKS, SHIPMENTS, ASSUMPTIONS, CORRIDOR_CITIES } from "@/lib/fleet-data";
import { topMatches, explainMatch, type Match } from "@/lib/matching";
import { forecastCorridor } from "@/lib/predictive.functions";

const CorridorMap = lazy(() => import("@/components/CorridorMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forward.ai — Predictive Backhaul, Delhi–Mumbai Corridor" },
      {
        name: "description",
        content:
          "AI-powered predictive backhaul matching across the Delhi–Mumbai freight corridor. Real OSRM routing, autonomous agent, concrete ₹ and CO₂ savings.",
      },
      { property: "og:title", content: "Forward.ai — Predictive Backhaul Platform" },
      {
        property: "og:description",
        content:
          "Autonomous coordinator that turns empty return legs into matched shipments on Indian freight corridors.",
      },
    ],
  }),
  component: Dashboard,
});

interface FeedItem {
  id: string;
  kind: "match" | "forecast" | "reroute" | "system";
  time: string;
  body: React.ReactNode;
}

function nowHHMM(offsetMs = 0) {
  const d = new Date(Date.now() - offsetMs);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Dashboard() {
  const matches = useMemo(() => topMatches(TRUCKS, SHIPMENTS, 8), []);
  const [focused, setFocused] = useState<Match | null>(matches[0] ?? null);
  const [committed, setCommitted] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [forecast, setForecast] = useState<
    Array<{ hub: string; hoursAhead: number; probability: number; expectedEmptyTrucks: number }>
  >([]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const callForecast = useServerFn(forecastCorridor);

  // Pull the predictive capacity forecast on mount and again every minute.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await callForecast({
          data: { hubs: ["Delhi", "Gurgaon", "Jaipur", "Ahmedabad", "Surat", "Mumbai"], windows: [6, 24, 48, 72] },
        });
        if (!cancelled) setForecast(res.results);
      } catch (e) {
        console.error(e);
      }
    };
    run();
    const id = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [callForecast]);

  // Smart header hide/show on scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY.current || y < 60);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Seed the agent feed, then trickle in additional events.
  useEffect(() => {
    const seed: FeedItem[] = [
      {
        id: "f0",
        kind: "match",
        time: nowHHMM(0),
        body: matches[0] ? (
          <>
            Match surfaced: <span className="font-semibold text-neutral-800">{matches[0].truck.plate}</span> →{" "}
            <span className="italic">{matches[0].shipment.cargo}</span> @{" "}
            {matches[0].shipment.pickup.name}.
          </>
        ) : (
          <>Scanning corridor…</>
        ),
      },
      {
        id: "f1",
        kind: "reroute",
        time: nowHHMM(4 * 60_000),
        body: (
          <>
            Adjusted <span className="font-semibold text-neutral-800">MH-04-ET-9012</span> pathing to avoid NH48
            congestion near Vadodara. ETA held at 19:00 Mumbai.
          </>
        ),
      },
      {
        id: "f2",
        kind: "forecast",
        time: nowHHMM(17 * 60_000),
        body: (
          <>
            Predictive surge: <span className="font-semibold text-neutral-800">Gurgaon</span> expected to release 8
            empty trailers tomorrow 06:00 (p=0.74).
          </>
        ),
      },
    ];
    setFeed(seed);

    const ticker = setInterval(() => {
      const m = matches[Math.floor(Math.random() * matches.length)];
      if (!m) return;
      setFeed((prev) =>
        [
          {
            id: `f-${Date.now()}`,
            kind: "match",
            time: nowHHMM(0),
            body: (
              <>
                Re-scored <span className="font-semibold text-neutral-800">{m.truck.plate}</span> ↔{" "}
                <span className="italic">{m.shipment.cargo}</span>:{" "}
                {m.overlapPct.toFixed(0)}% overlap, ₹
                {Math.round(m.rupeesSaved).toLocaleString("en-IN")} margin.
              </>
            ),
          } as FeedItem,
          ...prev,
        ].slice(0, 8),
      );
    }, 9_000);
    return () => clearInterval(ticker);
  }, [matches]);

  const totals = useMemo(() => {
    const committedMatches = matches.filter((m) => committed.has(m.id));
    const rupees = committedMatches.reduce((s, m) => s + m.rupeesSaved, 0);
    const litres = committedMatches.reduce((s, m) => s + m.fuelSavedLitres, 0);
    const co2 = committedMatches.reduce((s, m) => s + m.co2SavedKg, 0);
    return {
      rupees: rupees + 184200,
      litres: litres + 1422,
      co2: co2 + 3760,
      utilizationLift: 22.4 + committedMatches.length * 1.3,
    };
  }, [committed, matches]);

  function commit(m: Match) {
    setCommitted((prev) => {
      const next = new Set(prev);
      next.add(m.id);
      return next;
    });
    setFeed((prev) =>
      [
        {
          id: `c-${m.id}`,
          kind: "system",
          time: nowHHMM(0),
          body: (
            <>
              Committed: <span className="font-semibold text-neutral-800">{m.truck.plate}</span> dispatched to{" "}
              {m.shipment.pickup.name}. ₹{Math.round(m.rupeesSaved).toLocaleString("en-IN")} locked.
            </>
          ),
        } as FeedItem,
        ...prev,
      ].slice(0, 8),
    );
  }

  return (
    <div className="min-h-screen text-slate-900 relative">
      {/* Full-page fixed truck background */}
      <div
        className="fixed inset-0 -z-10"
        style={{ pointerEvents: "none" }}
      >
        <img
          src="/truck-bg.jpg"
          alt="Truck background"
          aria-hidden
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.85) contrast(1.05) saturate(0.9)" }}
        />
        {/* Light overlays so content and text are readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-white/40" />
      </div>

      <Header totals={totals} visible={headerVisible} />
      <main className="max-w-[1700px] mx-auto p-4 md:p-6 grid grid-cols-12 gap-5 h-[calc(100vh-64px)]">
        {/* Left column */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <AgentFeed items={feed} />
          <CapacityPanel forecast={forecast} />
        </aside>

        {/* Right column */}
        <section className="col-span-9 relative flex flex-col gap-4 min-h-0">
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-black/10 bg-white/40 backdrop-blur-md min-h-[420px] shadow-2xl">
            <Suspense
              fallback={
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-black/10 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">
                      Loading corridor…
                    </span>
                  </div>
                </div>
              }
            >
              <CorridorMap trucks={TRUCKS} shipments={SHIPMENTS} focusedMatch={focused} />
            </Suspense>

            {focused && (
              <FocusedMatchOverlay
                match={focused}
                onCommit={() => commit(focused)}
                committed={committed.has(focused.id)}
              />
            )}

            <Legend />
          </div>

          <MatchStrip
            matches={matches}
            focusedId={focused?.id ?? null}
            committedIds={committed}
            onSelect={(m) => setFocused(m)}
            onCommit={(m) => commit(m)}
          />
        </section>
      </main>
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
function Header({
  totals,
  visible,
}: {
  totals: { rupees: number; litres: number; co2: number; utilizationLift: number };
  visible: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-50 border-b border-black/5 bg-white/60 backdrop-blur-xl transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-[1700px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-black/5 backdrop-blur-sm border border-black/10 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h1 className="font-serif text-xl italic tracking-tight text-slate-900 drop-shadow-sm">Forward.ai</h1>
          </div>

          {/* Stats */}
          <nav className="flex items-center gap-7">
            <Stat label="Total Savings" value={`₹${formatINR(totals.rupees)}`} />
            <div className="h-5 w-px bg-black/10" />
            <Stat label="Fuel Offset" value={`${Math.round(totals.litres).toLocaleString("en-IN")} L`} />
            <div className="h-5 w-px bg-black/10" />
            <Stat label="CO₂ Reduced" value={`${Math.round(totals.co2).toLocaleString("en-IN")} kg`} />
            <div className="h-5 w-px bg-black/10" />
            <Stat label="Utilization" value={`+${totals.utilizationLift.toFixed(1)}%`} accent />
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/architecture"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5"
          >
            Architecture →
          </Link>

          {/* Live badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm rounded-full ring-1 ring-black/5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-900">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-semibold leading-none">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums leading-tight ${accent ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

/* ─── Agent Feed ─────────────────────────────────────────────────────────── */
function AgentFeed({ items }: { items: FeedItem[] }) {
  return (
    <section className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-2xl border border-black/5 shadow-lg overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center bg-white/40">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-white border border-black/5 flex items-center justify-center shadow-sm">
            <svg className="w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-tight text-slate-900">Autonomous Coordinator</h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">v4.2-STABLE</span>
          </div>
        </div>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      </div>

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {items.map((item, idx) => {
          const colors = {
            match:    { dot: "bg-blue-500",     bg: "bg-blue-50 border border-blue-200",    text: "text-blue-700",    label: "Match" },
            forecast: { dot: "bg-amber-500",    bg: "bg-amber-50 border border-amber-200",   text: "text-amber-700",   label: "Forecast" },
            reroute:  { dot: "bg-slate-500",    bg: "bg-slate-100 border border-slate-200",  text: "text-slate-700",    label: "Re-route" },
            system:   { dot: "bg-emerald-500",  bg: "bg-emerald-50 border border-emerald-200", text: "text-emerald-700",   label: "Committed" },
          }[item.kind];

          return (
            <div
              key={item.id}
              className="space-y-2 animate-slide-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className={`size-1.5 rounded-full ${colors.dot} shrink-0`} />
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                  {item.time} · {colors.label}
                </span>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed max-w-[38ch] [&_span]:text-slate-900">
                {item.body}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Capacity Panel ─────────────────────────────────────────────────────── */
function CapacityPanel({
  forecast,
}: {
  forecast: Array<{ hub: string; hoursAhead: number; probability: number; expectedEmptyTrucks: number }>;
}) {
  const rows = forecast
    .filter((f) => f.hoursAhead === 24)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  return (
    <section className="h-60 bg-white/70 backdrop-blur-xl text-slate-900 rounded-2xl border border-black/5 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.18em]">
            Capacity Forecast
          </h3>
          <p className="text-[9px] text-slate-500 mt-0.5 font-medium">24h window · ML inference</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-black/5 rounded-md shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-slate-700 font-bold">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-4 h-4 border border-black/10 border-t-slate-400 rounded-full animate-spin" />
            Forecasting…
          </div>
        )}
        {rows.map((r) => {
          const pct = Math.round(r.probability * 100);
          const color = pct > 65 ? "#10b981" : pct > 45 ? "#f59e0b" : "#64748b";
          return (
            <div key={r.hub} className="flex items-center gap-2.5 text-xs">
              <span className="w-[72px] text-slate-700 truncate font-semibold">{r.hub}</span>
              <div className="flex-1 h-1.5 bg-slate-200 overflow-hidden rounded-full relative progress-bar">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="text-right shrink-0 w-18">
                <span className="tabular-nums font-bold" style={{ color }}>{pct}%</span>
                <span className="text-slate-500 ml-1 text-[9px] font-medium">· {r.expectedEmptyTrucks}t</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Focused Match Overlay ──────────────────────────────────────────────── */
function FocusedMatchOverlay({
  match,
  onCommit,
  committed,
}: {
  match: Match;
  onCommit: () => void;
  committed: boolean;
}) {
  return (
    <div className="absolute top-5 left-5 max-w-[340px] z-[400] animate-slide-up">
      <div className="bg-white/95 backdrop-blur-2xl rounded-xl border border-black/10 shadow-2xl p-5 space-y-4 text-slate-900">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-bold mb-1">
              Backhaul opportunity
            </p>
            <h3 className="font-serif text-base leading-snug italic text-slate-900 font-semibold">
              {match.truck.current.name} → {match.shipment.pickup.name}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200">
              Score {match.score.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-black/5 rounded-lg">
          <Metric label="Overlap"  value={`${match.overlapPct.toFixed(0)}%`} />
          <Metric label="Savings"  value={`₹${formatINR(match.rupeesSaved)}`} accent />
          <Metric label="CO₂"      value={`${Math.round(match.co2SavedKg)} kg`} />
          <Metric label="Fuel"     value={`${match.fuelSavedLitres.toFixed(0)} L`} />
          <Metric label="Detour"   value={`${match.detourKm.toFixed(0)} km`} />
          <Metric label="Capacity" value={`${(match.capacityFit * 100).toFixed(0)}%`} />
        </div>

        {/* Explanation */}
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-300 pl-3">
          "{explainMatch(match)}"
        </p>

        {/* CTA */}
        <button
          onClick={onCommit}
          disabled={committed}
          className={`w-full py-2.5 px-4 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm border ${
            committed
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
              : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:shadow active:scale-[0.98] cursor-pointer"
          }`}
        >
          {committed ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Match committed
            </>
          ) : (
            <>
              Commit match
              <span className="text-slate-400">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase text-slate-500 font-bold tracking-[0.15em]">
        {label}
      </span>
      <span className={`text-sm font-extrabold tabular-nums leading-tight ${accent ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────────────────────── */
function Legend() {
  return (
    <div className="absolute bottom-5 right-5 z-[400]">
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-black/10 flex items-center gap-4 shadow-lg">
        <LegendDot color="bg-amber-500" label="Pending shipments" />
        <LegendDot color="bg-emerald-500" label="Empty-return trucks" />
        <LegendDot color="bg-amber-600" label="Match overlay" line />
      </div>
    </div>
  );
}

function LegendDot({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {line ? (
        <div className={`h-0.5 w-5 rounded-full ${color}`} />
      ) : (
        <div className={`size-2 rounded-full ${color}`} />
      )}
      <span className="text-[10px] font-bold text-slate-700">{label}</span>
    </div>
  );
}

/* ─── Match Strip ────────────────────────────────────────────────────────── */
function MatchStrip({
  matches,
  focusedId,
  committedIds,
  onSelect,
  onCommit,
}: {
  matches: Match[];
  focusedId: string | null;
  committedIds: Set<string>;
  onSelect: (m: Match) => void;
  onCommit: (m: Match) => void;
}) {
  return (
    <div className="h-44 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {matches.map((m, idx) => {
        const isFocused = m.id === focusedId;
        const isCommitted = committedIds.has(m.id);
        return (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelect(m);
              }
            }}
            className={`min-w-[360px] flex-shrink-0 p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 animate-slide-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 flex flex-col justify-between ${
              isFocused
                ? "bg-white border-slate-300 text-slate-900 shadow-xl"
                : "bg-white/60 backdrop-blur-md border-black/5 hover:border-black/15 text-slate-700 hover:text-slate-900 shadow-sm hover:shadow"
            }`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-500">
                  {m.truck.plate}
                </span>
                <h4 className={`text-sm font-bold mt-0.5 leading-snug ${isFocused ? "text-slate-900" : "text-slate-800"}`}>
                  {m.truck.current.name} → {m.truck.destination.name}{" "}
                  <span className="text-slate-500 font-medium">
                    via {m.shipment.pickup.name}
                  </span>
                </h4>
              </div>
              <span
                className={`text-[10px] px-2 py-1 rounded-lg border font-bold whitespace-nowrap shrink-0 ${
                  isCommitted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isFocused
                    ? "bg-slate-100 text-slate-900 border-slate-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}
              >
                ₹{formatINR(m.rupeesSaved)} {isCommitted ? "✓" : "profit"}
              </span>
            </div>

            <div className="flex items-end justify-between mt-2 gap-2">
              <p className={`text-[11px] line-clamp-2 leading-relaxed font-medium ${isFocused ? "text-slate-700" : "text-slate-600"}`}>
                <span className={isFocused ? "text-slate-900 font-bold" : "text-slate-800 font-bold"}>AI: </span>
                "{explainMatch(m)}"
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCommitted) onCommit(m);
                }}
                className={`shrink-0 p-2 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  isFocused
                    ? "border-slate-200 hover:bg-slate-100"
                    : "border-transparent hover:border-black/10 hover:bg-black/5"
                }`}
                title="Commit match"
              >
                {isCommitted ? (
                  <svg className="size-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatINR(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

// Suppress unused warning for CORRIDOR_CITIES / ASSUMPTIONS
void CORRIDOR_CITIES;
void ASSUMPTIONS;
