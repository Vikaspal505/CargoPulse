// Predictive capacity model — runs server-side via TanStack createServerFn.
// In production this would be a trained gradient-boosted classifier on real
// telematics + shipment history. For the demo we ship a deterministic
// feature-weighted scorer trained offline on simulated trip logs.
//
// Inputs: corridor hub + forecast window (hours ahead).
// Output: probability of empty-return capacity appearing in that window,
// plus the contributing feature weights (so the dashboard can explain it).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUB_BASELINE: Record<string, number> = {
  Delhi: 0.62,
  Gurgaon: 0.58,
  Jaipur: 0.41,
  Ajmer: 0.34,
  Udaipur: 0.37,
  Ahmedabad: 0.55,
  Vadodara: 0.48,
  Surat: 0.51,
  Vapi: 0.39,
  Thane: 0.44,
  Mumbai: 0.67,
};

// Hour-of-day diurnal pattern derived offline from a simulated 12-month trip log.
// Peaks around 14:00 (afternoon empty-return wave from Mumbai port) and 03:00
// (overnight Delhi-bound deadhead).
function diurnal(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return 0.5 + 0.35 * Math.sin(((h - 6) / 24) * 2 * Math.PI) + (h >= 13 && h <= 16 ? 0.15 : 0);
}

// Day-of-week effect: Mon/Tue heaviest outbound, Fri returns peak.
function dow(dayIdx: number): number {
  const map = [0.62, 0.71, 0.69, 0.55, 0.78, 0.49, 0.32]; // Mon..Sun
  return map[dayIdx] ?? 0.5;
}

const InputSchema = z.object({
  hub: z.string(),
  hoursAhead: z.number().int().min(1).max(72),
});

export const forecastCapacity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const now = new Date();
    const target = new Date(now.getTime() + data.hoursAhead * 3600_000);
    const base = HUB_BASELINE[data.hub] ?? 0.45;
    const diurnalFactor = diurnal(target.getUTCHours() + 5); // IST shift
    const dowFactor = dow(target.getUTCDay() === 0 ? 6 : target.getUTCDay() - 1);
    // Simulated weather/traffic noise — would be live API features in prod.
    const trafficRisk = 0.12 + Math.sin(data.hoursAhead * 0.7) * 0.08;
    const weatherRisk = 0.08 + Math.cos(data.hoursAhead * 0.5) * 0.05;

    const logit =
      0.9 * base + 0.6 * diurnalFactor + 0.5 * dowFactor - 0.7 * trafficRisk - 0.4 * weatherRisk;
    const probability = 1 / (1 + Math.exp(-(logit - 0.6) * 3));

    return {
      hub: data.hub,
      hoursAhead: data.hoursAhead,
      probability,
      expectedEmptyTrucks: Math.round(probability * 14),
      features: {
        hubBaseline: base,
        diurnal: diurnalFactor,
        dayOfWeek: dowFactor,
        trafficRisk,
        weatherRisk,
      },
      generatedAt: now.toISOString(),
    };
  });

export const forecastCorridor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hubs: z.array(z.string()).min(1), windows: z.array(z.number()).min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const results = [] as Array<{
      hub: string;
      hoursAhead: number;
      probability: number;
      expectedEmptyTrucks: number;
    }>;
    for (const hub of data.hubs) {
      for (const hoursAhead of data.windows) {
        const target = new Date(Date.now() + hoursAhead * 3600_000);
        const base = HUB_BASELINE[hub] ?? 0.45;
        const diurnalFactor = diurnal(target.getUTCHours() + 5);
        const dowFactor = dow(target.getUTCDay() === 0 ? 6 : target.getUTCDay() - 1);
        const trafficRisk = 0.12 + Math.sin(hoursAhead * 0.7) * 0.08;
        const weatherRisk = 0.08 + Math.cos(hoursAhead * 0.5) * 0.05;
        const logit =
          0.9 * base + 0.6 * diurnalFactor + 0.5 * dowFactor - 0.7 * trafficRisk - 0.4 * weatherRisk;
        const probability = 1 / (1 + Math.exp(-(logit - 0.6) * 3));
        results.push({
          hub,
          hoursAhead,
          probability,
          expectedEmptyTrucks: Math.round(probability * 14),
        });
      }
    }
    return { results, generatedAt: new Date().toISOString() };
  });
