// Routing helpers — OSRM public demo endpoint plus geometry math.
// OSRM returns real road geometry along the Delhi–Mumbai corridor.

import type { LatLng } from "./fleet-data";

const OSRM = "https://router.project-osrm.org/route/v1/driving";

export interface RouteResult {
  distanceKm: number;
  durationHours: number;
  geometry: LatLng[]; // [lat, lng] points decoded from polyline
}

// Decode the polyline-6 (precision 5) format OSRM returns by default.
function decodePolyline(str: string, precision = 5): LatLng[] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: LatLng[] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

export async function fetchRoute(points: LatLng[]): Promise<RouteResult | null> {
  if (points.length < 2) return null;
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=polyline`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: route.distance / 1000,
      durationHours: route.duration / 3600,
      geometry: decodePolyline(route.geometry),
    };
  } catch {
    return null;
  }
}

// Haversine distance, km — used for client-side overlap math when OSRM hasn't returned yet.
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Minimum distance from a point to a polyline (great-circle approximation).
function pointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = a[1], ay = a[0], bx = b[1], by = b[0], px = p[1], py = p[0];
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return haversineKm(p, a);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const proj: LatLng = [ay + t * dy, ax + t * dx];
  return haversineKm(p, proj);
}

export function pointNearPolylineKm(p: LatLng, poly: LatLng[]): number {
  if (poly.length === 0) return Infinity;
  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = pointToSegmentKm(p, poly[i], poly[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
