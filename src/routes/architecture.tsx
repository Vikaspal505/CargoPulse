import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Forward.ai Predictive Backhaul Platform" },
      {
        name: "description",
        content:
          "Systems blueprint for a national-scale agentic logistics platform: telematics ingestion, message queues, predictive ML, routing, and the autonomous coordinator.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const LAYERS = [
  {
    id: "ingest",
    icon: "📡",
    title: "Ingest",
    color: "from-blue-500 to-cyan-500",
    ring: "ring-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    blurb:
      "Truck telematics (GPS, fuel, ELD), shipment APIs, weather, and traffic flow into the event bus as discrete events. Idempotent keys per (truck_id, ts) prevent duplicates.",
    items: [
      "Kafka topics: trip.tick, shipment.created, weather.alert",
      "10–50k events/sec at national scale",
      "Edge gateways validate + sign payloads",
    ],
  },
  {
    id: "ml",
    icon: "🧠",
    title: "Predictive ML",
    color: "from-violet-500 to-purple-600",
    ring: "ring-violet-200",
    bg: "bg-violet-50",
    text: "text-violet-700",
    blurb:
      "A gradient-boosted classifier scores every (corridor, hour) cell for empty-return probability 24–72h ahead. Features include diurnal patterns, day-of-week, weather, and historical hub baselines.",
    items: [
      "Training: offline on 12mo of trip logs",
      "Serving: server function · sub-50ms p99",
      "Drift monitor retrains weekly",
    ],
  },
  {
    id: "routing",
    icon: "🗺️",
    title: "Routing",
    color: "from-emerald-500 to-green-600",
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    blurb:
      "OSRM (or Valhalla) computes true road distance, duration, and geometry. The matching engine scores route overlap, detour cost, and capacity fit using mathematically verified data — never LLM estimates.",
    items: [
      "OSRM cluster · sharded by corridor",
      "Multi-criteria scorer: overlap × fit × emptiness − detour",
      "Returns concrete km, litres, ₹, kg CO₂",
    ],
  },
  {
    id: "agent",
    icon: "🤖",
    title: "Agentic Layer",
    color: "from-amber-500 to-orange-500",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    blurb:
      "A super-agent watches the event stream and dispatches specialized sub-agents: a routing agent, a capacity agent, a pricing agent. An LLM only generates the human explanation, grounded in verified facts — preventing hallucinations.",
    items: [
      "Tool-use loop with stopWhen(stepCountIs(50))",
      "LLM role: phrase, don't decide",
      "Operator-in-the-loop for high-value commits",
    ],
  },
];

const SCALE_POINTS = [
  {
    icon: "⚡",
    title: "Decoupled by design",
    body: "Ingest, ML, routing, and the agent communicate only through the bus. Any layer can scale independently without breaking others.",
  },
  {
    icon: "🔒",
    title: "Grounded LLM",
    body: "The model is restricted to explaining decisions made by deterministic code. No hallucinated savings, no invented routes.",
  },
  {
    icon: "🛡️",
    title: "Enterprise safety",
    body: "All mutations (committing a match, releasing a truck) require human approval or a signed policy rule before execution.",
  },
  {
    icon: "📊",
    title: "Observable & auditable",
    body: "Every agent action is logged with full provenance — model version, feature values, and the deterministic score that drove the decision.",
  },
];

function ArchitecturePage() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <div className="min-h-screen text-slate-900">

      {/* ─── FULL-PAGE fixed truck background ─────────────────────────────── */}
      <div
        className="fixed inset-0 -z-10"
        style={{ pointerEvents: "none" }}
      >
        <img
          src="/truck-bg.jpg"
          alt=""
          aria-hidden
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.85) contrast(1.05) saturate(0.9)" }}
        />
        {/* Light overlays so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-white/40" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.05]"
        style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-black/5 backdrop-blur-sm border border-black/10 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-3.5 h-3.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-serif text-xl italic tracking-tight text-slate-900 drop-shadow-sm">Forward.ai</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Operations
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="min-h-[80vh] flex flex-col justify-end max-w-[1100px] mx-auto w-full px-6 pb-16">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
          <div className="h-px w-10 bg-amber-400/70" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-amber-300/90 font-bold">Blueprint</span>
        </div>

        {/* Headline */}
        <h1
          className="font-serif text-5xl md:text-7xl italic leading-[1.02] text-slate-900 max-w-4xl text-balance drop-shadow-sm animate-slide-up"
          style={{ animationDelay: "80ms" }}
        >
          A super-agent architecture for national-scale backhaul matching.
        </h1>

        {/* Sub */}
        <p
          className="mt-5 text-base text-slate-700 max-w-2xl leading-relaxed animate-slide-up font-medium"
          style={{ animationDelay: "160ms" }}
        >
          Today&apos;s demo runs on a fixed Delhi–Mumbai dataset. In production, the same
          coordinator scales to every Indian freight corridor via a streaming telematics
          ingest, event bus, and a fleet of specialized sub-agents.
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-8 animate-slide-up" style={{ animationDelay: "240ms" }}>
          {[
            { value: "50k+", label: "events/sec" },
            { value: "<50ms", label: "ML inference p99" },
            { value: "24–72h", label: "forecast horizon" },
            { value: "100%", label: "deterministic scoring" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-4 py-2.5 rounded-xl flex flex-col gap-0.5"
              style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}
            >
              <span className="text-xl font-bold text-slate-900 tabular-nums">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{s.label}</span>
            </div>
          ))}
          <Link
            to="/"
            className="ml-auto self-end flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:gap-3 shadow-md"
            style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)" }}
          >
            Open Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Rest of page — all over the truck bg ── */}
      <main className="max-w-[1100px] mx-auto px-6 pb-24 space-y-16">

        {/* ── Dataflow diagram ── */}
        <Blueprint />

        {/* ── Layer cards ── */}
        <section className="grid grid-cols-2 gap-5 animate-slide-up">
          {LAYERS.map((layer) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              active={activeLayer === layer.id}
              onToggle={() => setActiveLayer((prev) => (prev === layer.id ? null : layer.id))}
            />
          ))}
        </section>

        {/* ── Why it scales ── */}
        <section className="space-y-8 animate-slide-up">
          <div className="space-y-1 border-t border-black/10 pt-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold">Scalability</p>
            <h2 className="font-serif text-3xl italic text-slate-900">Why this works at scale</h2>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {SCALE_POINTS.map((p) => (
              <div
                key={p.title}
                className="p-5 rounded-xl space-y-2 hover:-translate-y-1 transition-transform"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{p.icon}</span>
                  <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <section
          className="rounded-2xl mt-4 animate-slide-up shadow-xl"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)", border: "1px solid rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between px-10 py-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-500 font-bold mb-2">
                Live platform
              </p>
              <p className="font-serif text-3xl italic text-slate-900 drop-shadow-sm font-semibold">
                Ready to see it live?
              </p>
              <p className="text-sm text-slate-600 font-medium mt-1.5">
                Return to the operations dashboard and commit your first match.
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:gap-4 shrink-0 shadow-lg"
              style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)" }}
            >
              Open Dashboard
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─── Layer Card ─────────────────────────────────────────────────────────── */
function LayerCard({
  layer,
  active,
  onToggle,
}: {
  layer: (typeof LAYERS)[0];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="text-left p-5 rounded-xl transition-all duration-200 space-y-3 w-full hover:-translate-y-1 shadow-sm hover:shadow-md"
      style={
        active
          ? { background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }
          : { background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.05)" }
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${layer.color} shadow-sm`}>
            {layer.icon}
          </div>
          <h3 className="text-lg font-serif italic text-slate-900 font-semibold">{layer.title}</h3>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 shrink-0 mt-0.5 text-slate-400 ${active ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Blurb */}
      <p className="text-sm leading-relaxed text-slate-600 font-medium">{layer.blurb}</p>

      {/* Items */}
      <ul className={`space-y-1.5 transition-all ${active ? "opacity-100" : "opacity-60"}`}>
        {layer.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs font-medium">
            <span className="mt-0.5 shrink-0 text-slate-300">—</span>
            <span className="text-slate-600">{item}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

/* ─── Blueprint Dataflow ─────────────────────────────────────────────────── */
function Blueprint() {
  return (
    <div
      className="text-slate-900 rounded-2xl p-8 md:p-10 shadow-xl animate-slide-up"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">Dataflow</p>
          <p className="text-sm text-slate-700 font-serif italic mt-1 font-semibold">Event-driven pipeline</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full ring-1 ring-black/[0.06] shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-600 font-bold">Real-time</span>
        </div>
      </div>

      <svg viewBox="0 0 900 300" className="w-full h-auto" role="img" aria-label="System dataflow diagram">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" />
          </marker>
          <marker id="arr-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
          </marker>
          <marker id="arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          <linearGradient id="bus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Producers */}
        {[
          { x: 30, y: 25,  label: "Truck telematics", emoji: "🚛" },
          { x: 30, y: 100, label: "Shipment APIs",    emoji: "📦" },
          { x: 30, y: 175, label: "Weather / traffic", emoji: "🌦" },
          { x: 30, y: 250, label: "Operator console",  emoji: "🖥" },
        ].map((p) => (
          <g key={p.label}>
            <rect x={p.x} y={p.y} width="170" height="42" rx="8" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
            <text x={p.x + 32} y={p.y + 27} fontSize="12" fill="#e4e4e7" fontFamily="Inter">{p.label}</text>
            <text x={p.x + 10} y={p.y + 28} fontSize="14">{p.emoji}</text>
            <line x1={p.x + 170} y1={p.y + 21} x2="295" y2="148" stroke="#52525b" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4 3" />
          </g>
        ))}

        {/* Event Bus */}
        <rect x="295" y="127" width="175" height="42" rx="10" fill="url(#bus-grad)" />
        <text x="382" y="151" textAnchor="middle" fontSize="12" fill="#0a0a0a" fontFamily="Inter" fontWeight="700">Event Bus (Kafka)</text>
        <text x="382" y="163" textAnchor="middle" fontSize="9" fill="#78350f" fontFamily="Inter">10–50k events/sec</text>

        {/* Services */}
        {[
          { y: 25,  label: "Predictive ML",     emoji: "🧠", color: "#7c3aed" },
          { y: 100, label: "OSRM routing",       emoji: "🗺",  color: "#059669" },
          { y: 175, label: "Matching engine",    emoji: "⚖",  color: "#2563eb" },
          { y: 250, label: "Super-agent (LLM)", emoji: "🤖", color: "#d97706" },
        ].map((s) => (
          <g key={s.label}>
            <line x1="470" y1="148" x2="545" y2={s.y + 21} stroke="#52525b" strokeWidth="1.5" markerEnd="url(#arr-green)" strokeDasharray="4 3" />
            <rect x="545" y={s.y} width="180" height="42" rx="8" fill="#1a1a1f" stroke={s.color} strokeWidth="1.5" />
            <text x="572" y={s.y + 28} fontSize="12" fill="#e4e4e7" fontFamily="Inter">{s.label}</text>
            <text x="554" y={s.y + 28} fontSize="14">{s.emoji}</text>
          </g>
        ))}

        {/* Dashboard sink */}
        <rect x="760" y="127" width="120" height="42" rx="8" fill="#fafafa" />
        <text x="820" y="147" textAnchor="middle" fontSize="11" fill="#111" fontFamily="Inter" fontWeight="600">Dashboard</text>
        <text x="820" y="161" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="Inter">Forward.ai</text>
        {[25, 100, 175, 250].map((y, i) => (
          <line key={i} x1="725" y1={y + 21} x2="760" y2="148" stroke="#3f3f46" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4 3" />
        ))}
      </svg>
    </div>
  );
}
