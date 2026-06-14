// Multi-criteria matching engine. Scores every (truck, shipment) pair using:
//   - geometric route overlap along the corridor (Haversine corridor distance)
//   - pickup/dropoff proximity to truck's planned path
//   - capacity fit
//   - empty-return-leg preference
//
// Produces concrete ₹, litres, kg-CO2 savings per match using ASSUMPTIONS.

import {
  ASSUMPTIONS,
  type Shipment,
  type Truck,
  CORRIDOR_CITIES,
} from "./fleet-data";
import { haversineKm, pointNearPolylineKm } from "./routing";

export interface Match {
  id: string;
  truck: Truck;
  shipment: Shipment;
  overlapPct: number;
  detourKm: number;
  reclaimedDeadheadKm: number;
  fuelSavedLitres: number;
  co2SavedKg: number;
  rupeesSaved: number;
  capacityFit: number; // 0..1
  score: number;        // 0..100
  reasonFacts: string[]; // bullet facts for the LLM to phrase
}

const CORRIDOR_POLY = CORRIDOR_CITIES.map((c) => c.coords);

function corridorTruckPath(t: Truck) {
  // Sort the corridor cities by distance from origin->dest line to approximate
  // the planned road path between the truck's current location and destination.
  const start = t.current.coords;
  const end = t.destination.coords;
  const between = CORRIDOR_CITIES.filter((c) => {
    const dStart = haversineKm(start, c.coords);
    const dEnd = haversineKm(end, c.coords);
    const dDirect = haversineKm(start, end);
    return dStart + dEnd < dDirect * 1.25;
  });
  const ordered = between.sort(
    (a, b) => haversineKm(start, a.coords) - haversineKm(start, b.coords),
  );
  return [start, ...ordered.map((c) => c.coords), end];
}

export function scoreMatch(truck: Truck, shipment: Shipment): Match | null {
  const path = corridorTruckPath(truck);
  const pickupDist = pointNearPolylineKm(shipment.pickup.coords, path);
  const dropoffDist = pointNearPolylineKm(shipment.dropoff.coords, path);

  // Reject obvious mismatches: > 80km off-corridor.
  if (pickupDist > 80 || dropoffDist > 80) return null;

  const truckPathKm = (() => {
    let s = 0;
    for (let i = 0; i < path.length - 1; i++) s += haversineKm(path[i], path[i + 1]);
    return s;
  })();
  const shipmentKm = haversineKm(shipment.pickup.coords, shipment.dropoff.coords);

  // Overlap = how much of the shipment route the truck already covers.
  const overlapKm = Math.max(
    0,
    shipmentKm - (pickupDist + dropoffDist) * 0.5,
  );
  const overlapPct = Math.max(0, Math.min(100, (overlapKm / shipmentKm) * 100));

  const detourKm = pickupDist + dropoffDist;
  const reclaimedDeadheadKm = truck.emptyReturn ? overlapKm : overlapKm * 0.4;

  const fuelSavedLitres = reclaimedDeadheadKm / ASSUMPTIONS.kmPerLitre;
  const co2SavedKg = fuelSavedLitres * ASSUMPTIONS.co2KgPerLitre;
  const rupeesSaved =
    reclaimedDeadheadKm * ASSUMPTIONS.emptyDeadheadCostInrPerKm -
    detourKm * (ASSUMPTIONS.emptyDeadheadCostInrPerKm * 0.5);

  const capacityFit = Math.min(1, shipment.weightTons / truck.capacityTons);

  // Composite score: weighted blend.
  const score = Math.max(
    0,
    Math.min(
      100,
      overlapPct * 0.55 +
        capacityFit * 25 +
        (truck.emptyReturn ? 15 : 5) -
        detourKm * 0.05,
    ),
  );

  const reasonFacts = [
    `${overlapPct.toFixed(0)}% route overlap on the ${truck.current.name}–${truck.destination.name} leg`,
    truck.emptyReturn ? "return leg currently empty" : "partial capacity available",
    `pickup ${pickupDist.toFixed(0)} km off-route at ${shipment.pickup.name}`,
    `reclaims ~${reclaimedDeadheadKm.toFixed(0)} km of deadhead`,
    `saves ≈ ₹${Math.round(rupeesSaved).toLocaleString("en-IN")} and ${co2SavedKg.toFixed(0)} kg CO₂`,
  ];

  return {
    id: `${truck.id}-${shipment.id}`,
    truck,
    shipment,
    overlapPct,
    detourKm,
    reclaimedDeadheadKm,
    fuelSavedLitres,
    co2SavedKg,
    rupeesSaved: Math.max(0, rupeesSaved),
    capacityFit,
    score,
    reasonFacts,
  };
}

export function topMatches(trucks: Truck[], shipments: Shipment[], limit = 8): Match[] {
  const all: Match[] = [];
  for (const t of trucks) {
    for (const s of shipments) {
      const m = scoreMatch(t, s);
      if (m && m.rupeesSaved > 0) all.push(m);
    }
  }
  return all.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Deterministic, math-grounded explanation. LLM-style phrasing without any model call —
// we restrict generation to the verified facts so there are no hallucinations.
export function explainMatch(m: Match): string {
  const truckLabel = `${m.truck.plate}`;
  const overlap = m.overlapPct.toFixed(0);
  const corridor = `${m.truck.current.name}–${m.truck.destination.name}`;
  const rupees = `₹${Math.round(m.rupeesSaved).toLocaleString("en-IN")}`;
  const co2 = `${m.co2SavedKg.toFixed(0)} kg CO₂`;
  const detour = m.detourKm < 5 ? "on-route pickup" : `${m.detourKm.toFixed(0)} km detour`;
  const legState = m.truck.emptyReturn ? "returning empty" : "with spare capacity";
  return `${truckLabel} is ${legState} along the ${corridor} corridor with ${overlap}% overlap on the ${m.shipment.cargo.toLowerCase()} run. A ${detour} converts ${m.reclaimedDeadheadKm.toFixed(0)} km of deadhead into revenue, saving ${rupees} and ${co2}.`;
}
