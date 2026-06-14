// Client-only Leaflet map. Renders the Delhi–Mumbai corridor with truck and
// shipment markers and (when fetched) real OSRM road geometry for the
// currently focused match.

import { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import { CORRIDOR_CITIES, type Truck, type Shipment } from "@/lib/fleet-data";
import { fetchRoute, type RouteResult } from "@/lib/routing";
import type { Match } from "@/lib/matching";

/* ─── Custom icons ────────────────────────────────────────────────────────── */
const truckIcon = (label: string, highlighted = false) =>
  L.divIcon({
    className: "",
    html: `<div class="truck-marker" style="width:30px;height:30px;${
      highlighted
        ? "box-shadow:0 0 0 3px #166534,0 4px 12px rgba(22,101,52,0.35);"
        : ""
    }">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const shipmentIcon = (label: string, highlighted = false) =>
  L.divIcon({
    className: "",
    html: `<div class="shipment-marker" style="width:24px;height:24px;${
      highlighted
        ? "box-shadow:0 0 0 3px #d97706,0 4px 12px rgba(217,119,6,0.35);"
        : ""
    }">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

/* ─── FlyTo helper ────────────────────────────────────────────────────────── */
function FlyTo({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { padding: [72, 72], duration: 0.9, maxZoom: 10 });
  }, [bounds, map]);
  return null;
}

/* ─── Attribution strip ───────────────────────────────────────────────────── */
function MapControls({ trucksVisible, shipmentsVisible, onToggleTrucks, onToggleShipments }: {
  trucksVisible: boolean;
  shipmentsVisible: boolean;
  onToggleTrucks: () => void;
  onToggleShipments: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
      <button
        onClick={onToggleTrucks}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all shadow-md cursor-pointer ${
          trucksVisible
            ? "bg-emerald-600 text-white border border-emerald-500/30"
            : "bg-neutral-900/80 text-white/50 border border-white/10 hover:text-white/80"
        }`}
        title="Toggle truck markers"
      >
        🚛 Trucks
      </button>
      <button
        onClick={onToggleShipments}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all shadow-md cursor-pointer ${
          shipmentsVisible
            ? "bg-amber-600 text-white border border-amber-500/30"
            : "bg-neutral-900/80 text-white/50 border border-white/10 hover:text-white/80"
        }`}
        title="Toggle shipment markers"
      >
        📦 Shipments
      </button>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export interface CorridorMapProps {
  trucks: Truck[];
  shipments: Shipment[];
  focusedMatch: Match | null;
}

export function CorridorMap({ trucks, shipments, focusedMatch }: CorridorMapProps) {
  const [truckRoutes, setTruckRoutes] = useState<Record<string, RouteResult>>({});
  const [matchRoute, setMatchRoute] = useState<RouteResult | null>(null);
  const [trucksVisible, setTrucksVisible] = useState(true);
  const [shipmentsVisible, setShipmentsVisible] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Fetch real road geometry for all trucks (current → destination).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, RouteResult> = {};
      for (const t of trucks) {
        const r = await fetchRoute([t.current.coords, t.destination.coords]);
        if (r && !cancelled) out[t.id] = r;
      }
      if (!cancelled) setTruckRoutes(out);
    })();
    return () => { cancelled = true; };
  }, [trucks]);

  // Fetch the focused match overlay route: current → pickup → dropoff.
  useEffect(() => {
    let cancelled = false;
    if (!focusedMatch) {
      setMatchRoute(null);
      return;
    }
    setLoadingRoute(true);
    (async () => {
      const r = await fetchRoute([
        focusedMatch.truck.current.coords,
        focusedMatch.shipment.pickup.coords,
        focusedMatch.shipment.dropoff.coords,
      ]);
      if (!cancelled) {
        setMatchRoute(r);
        setLoadingRoute(false);
      }
    })();
    return () => { cancelled = true; };
  }, [focusedMatch]);

  const focusedBounds = focusedMatch
    ? (L.latLngBounds([
        focusedMatch.truck.current.coords,
        focusedMatch.shipment.pickup.coords,
        focusedMatch.shipment.dropoff.coords,
        focusedMatch.truck.destination.coords,
      ]) as L.LatLngBoundsExpression)
    : null;

  const toggleTrucks = useCallback(() => setTrucksVisible((v) => !v), []);
  const toggleShipments = useCallback(() => setShipmentsVisible((v) => !v), []);

  return (
    <div className="relative h-full w-full">
      {/* Route loading indicator */}
      {loadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-slate-200 shadow-lg">
          <div className="w-3 h-3 border-2 border-black/10 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Routing…</span>
        </div>
      )}

      {/* Toggle controls */}
      <MapControls
        trucksVisible={trucksVisible}
        shipmentsVisible={shipmentsVisible}
        onToggleTrucks={toggleTrucks}
        onToggleShipments={toggleShipments}
      />

      <MapContainer
        center={[24.5, 75]}
        zoom={6}
        scrollWheelZoom={true}
        zoomControl={true}
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a> · Routing by OSRM'
          maxZoom={18}
        />

        {/* Corridor reference polyline */}
        <Polyline
          positions={CORRIDOR_CITIES.map((c) => c.coords)}
          pathOptions={{ color: "#d4d4d8", weight: 2, dashArray: "5 7", opacity: 0.6 }}
        />

        {/* All truck planned routes (OSRM road geometry) */}
        {Object.entries(truckRoutes).map(([id, r]) => {
          const isFocused = focusedMatch?.truck.id === id;
          return (
            <Polyline
              key={id}
              positions={r.geometry}
              pathOptions={{
                color: isFocused ? "#166534" : "#166534",
                weight: isFocused ? 3 : 2,
                opacity: isFocused ? 0.75 : 0.4,
              }}
            />
          );
        })}

        {/* Focused match: amber overlay route */}
        {matchRoute && (
          <Polyline
            positions={matchRoute.geometry}
            pathOptions={{
              color: "#d97706",
              weight: 5,
              opacity: 0.92,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Hub city dots */}
        {CORRIDOR_CITIES.map((c) => (
          <CircleMarker
            key={c.id}
            center={c.coords}
            radius={4}
            pathOptions={{
              color: "#fff",
              fillColor: "#52525b",
              fillOpacity: 1,
              weight: 1.5,
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -6]}
              className="!bg-white !text-xs !border-0 !shadow-lg !rounded-lg !px-2 !py-1 !font-medium"
            >
              {c.name}
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Shipment pickup markers */}
        {shipmentsVisible &&
          shipments.map((s, i) => {
            const isPickup =
              focusedMatch?.shipment.id === s.id;
            return (
              <Marker
                key={s.id}
                position={s.pickup.coords}
                icon={shipmentIcon(String(i + 1), isPickup)}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <div className="text-xs space-y-0.5 min-w-[140px]">
                    <div className="font-semibold text-neutral-800">{s.cargo}</div>
                    <div className="text-neutral-500">
                      {s.pickup.name} → {s.dropoff.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                      <span>{s.weightTons}t</span>
                      <span>·</span>
                      <span>₹{s.priceInr.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Truck markers */}
        {trucksVisible &&
          trucks.map((t) => {
            const isFocused = focusedMatch?.truck.id === t.id;
            return (
              <Marker
                key={t.id}
                position={t.current.coords}
                icon={truckIcon(t.plate.split("-")[0], isFocused)}
              >
                <Tooltip direction="top" offset={[0, -12]}>
                  <div className="text-xs space-y-1 min-w-[160px]">
                    <div className="font-semibold font-mono text-neutral-800">{t.plate}</div>
                    <div className="text-neutral-500">
                      {t.current.name} → {t.destination.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] flex-wrap">
                      <span className="text-neutral-400">{t.capacityTons}t capacity</span>
                      {t.emptyReturn && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">
                          Empty return
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400">Driver: {t.driver}</div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        <FlyTo bounds={focusedBounds} />
      </MapContainer>
    </div>
  );
}

export default CorridorMap;
