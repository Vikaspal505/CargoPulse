// Mock data for the Delhi–Mumbai freight corridor demo.
// Coordinates are real lat/lng so they plot correctly on Leaflet.

export type LatLng = [number, number];

export interface City {
  id: string;
  name: string;
  coords: LatLng;
}

export const CORRIDOR_CITIES: City[] = [
  { id: "del", name: "Delhi", coords: [28.6139, 77.209] },
  { id: "ggn", name: "Gurgaon", coords: [28.4595, 77.0266] },
  { id: "jai", name: "Jaipur", coords: [26.9124, 75.7873] },
  { id: "ajm", name: "Ajmer", coords: [26.4499, 74.6399] },
  { id: "udr", name: "Udaipur", coords: [24.5854, 73.7125] },
  { id: "amd", name: "Ahmedabad", coords: [23.0225, 72.5714] },
  { id: "vad", name: "Vadodara", coords: [22.3072, 73.1812] },
  { id: "srt", name: "Surat", coords: [21.1702, 72.8311] },
  { id: "vpi", name: "Vapi", coords: [20.3893, 72.9106] },
  { id: "tha", name: "Thane", coords: [19.2183, 72.9781] },
  { id: "mum", name: "Mumbai", coords: [19.076, 72.8777] },
];

const cityByName = (n: string) => CORRIDOR_CITIES.find((c) => c.name === n)!;

export interface Truck {
  id: string;
  plate: string;
  origin: City;
  destination: City;
  current: City;
  capacityTons: number;
  emptyReturn: boolean;          // true = leg currently empty
  etaHours: number;
  driver: string;
}

export interface Shipment {
  id: string;
  cargo: string;
  weightTons: number;
  pickup: City;
  dropoff: City;
  windowHours: number;
  status: "pending" | "matched";
  priceInr: number;              // gross freight value
}

export const TRUCKS: Truck[] = [
  { id: "t1", plate: "HR-55-AB-1234", origin: cityByName("Mumbai"), destination: cityByName("Delhi"), current: cityByName("Vadodara"), capacityTons: 18, emptyReturn: true, etaHours: 14, driver: "R. Yadav" },
  { id: "t2", plate: "DL-01-GB-4421", origin: cityByName("Delhi"), destination: cityByName("Mumbai"), current: cityByName("Gurgaon"), capacityTons: 22, emptyReturn: false, etaHours: 22, driver: "S. Khan" },
  { id: "t3", plate: "MH-04-ET-9012", origin: cityByName("Mumbai"), destination: cityByName("Jaipur"), current: cityByName("Surat"), capacityTons: 16, emptyReturn: true, etaHours: 11, driver: "A. Singh" },
  { id: "t4", plate: "GJ-01-VX-8892", origin: cityByName("Surat"), destination: cityByName("Delhi"), current: cityByName("Ahmedabad"), capacityTons: 14, emptyReturn: true, etaHours: 16, driver: "P. Patel" },
  { id: "t5", plate: "RJ-14-GH-4455", origin: cityByName("Jaipur"), destination: cityByName("Vadodara"), current: cityByName("Ajmer"), capacityTons: 12, emptyReturn: true, etaHours: 9, driver: "M. Sharma" },
  { id: "t6", plate: "MH-43-XY-9011", origin: cityByName("Mumbai"), destination: cityByName("Udaipur"), current: cityByName("Vapi"), capacityTons: 20, emptyReturn: false, etaHours: 13, driver: "K. Pawar" },
];

export const SHIPMENTS: Shipment[] = [
  { id: "s1", cargo: "Textile bales", weightTons: 12, pickup: cityByName("Surat"), dropoff: cityByName("Delhi"), windowHours: 24, status: "pending", priceInr: 86000 },
  { id: "s2", cargo: "Auto parts", weightTons: 8, pickup: cityByName("Vadodara"), dropoff: cityByName("Gurgaon"), windowHours: 18, status: "pending", priceInr: 64000 },
  { id: "s3", cargo: "Pharma cartons", weightTons: 5, pickup: cityByName("Ahmedabad"), dropoff: cityByName("Jaipur"), windowHours: 12, status: "pending", priceInr: 42000 },
  { id: "s4", cargo: "FMCG cases", weightTons: 9, pickup: cityByName("Vapi"), dropoff: cityByName("Udaipur"), windowHours: 20, status: "pending", priceInr: 51000 },
  { id: "s5", cargo: "Marble blocks", weightTons: 14, pickup: cityByName("Udaipur"), dropoff: cityByName("Mumbai"), windowHours: 30, status: "pending", priceInr: 92000 },
  { id: "s6", cargo: "Electronics", weightTons: 4, pickup: cityByName("Jaipur"), dropoff: cityByName("Ahmedabad"), windowHours: 14, status: "pending", priceInr: 38000 },
];

// Real-world assumptions for the savings dashboard.
export const ASSUMPTIONS = {
  dieselPriceInrPerLitre: 92,
  kmPerLitre: 4.2,
  co2KgPerLitre: 2.68,
  emptyDeadheadCostInrPerKm: 28,
};
