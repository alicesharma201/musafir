import { describe, expect, it } from "vitest";
import { PLACES, byId } from "@/lib/jaipur-data";
import {
  calculateStraightLineDistanceKm,
  formatStraightLineDistance,
  formatDistance,
  synthesizeRecommendationReason,
  calculateTagMatch,
  rankAlternatives,
  applyStopReplacement,
  removeStopReplacement,
  type CrowdPredictor,
  type CrowdPredictionResult,
} from "@/lib/recommendation";
import {
  resolveStop,
  buildOriginal,
  buildSmart,
  type Plan,
} from "@/components/musafir/Sections";

describe("Geodesic Distance Utilities", () => {
  it("computes 0 km for identical coordinates", () => {
    const dist = calculateStraightLineDistanceKm(26.9855, 75.8513, 26.9855, 75.8513);
    expect(dist).toBe(0);
  });

  it("accurately computes straight-line distance between Amber Fort and Panna Meena Kund (~0.67 km)", () => {
    const amber = byId("amber");
    const panna = byId("panna");
    const dist = calculateStraightLineDistanceKm(amber.lat, amber.lng, panna.lat, panna.lng);
    expect(dist).toBeGreaterThan(0.6);
    expect(dist).toBeLessThan(0.75);
  });

  it("accurately computes straight-line distance between Amber Fort and Jaigarh Fort (~0.57 km)", () => {
    const amber = byId("amber");
    const jaigarh = byId("jaigarh");
    const dist = calculateStraightLineDistanceKm(amber.lat, amber.lng, jaigarh.lat, jaigarh.lng);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(0.65);
  });

  it("accurately computes straight-line distance between Hawa Mahal and Jantar Mantar (~0.23 km)", () => {
    const hawa = byId("hawa");
    const jantar = byId("jantar");
    const dist = calculateStraightLineDistanceKm(hawa.lat, hawa.lng, jantar.lat, jantar.lng);
    expect(dist).toBeGreaterThan(0.15);
    expect(dist).toBeLessThan(0.3);
  });

  it("formats distances under 1 km as meters and above 1 km as kilometers with straight-line label", () => {
    expect(formatStraightLineDistance(0.67)).toBe("670 m straight-line");
    expect(formatStraightLineDistance(0.05)).toBe("50 m straight-line");
    expect(formatStraightLineDistance(3.54)).toBe("3.5 km straight-line");
    expect(formatStraightLineDistance(12.8)).toBe("12.8 km straight-line");
  });

  it("formats distances cleanly with formatDistance without internal jargon", () => {
    expect(formatDistance(0.67)).toBe("670 m");
    expect(formatDistance(0.05)).toBe("50 m");
    expect(formatDistance(1.6)).toBe("1.6 km");
    expect(formatDistance(12.8)).toBe("12.8 km");
  });
});

describe("Reason Synthesis", () => {
  it("synthesizes destination-specific, explainable recommendation reasons without generic repetition", () => {
    const amber = byId("amber");
    const panna = byId("panna");
    const reason = synthesizeRecommendationReason(panna, amber, 0.67, ["heritage", "photography"]);

    expect(reason).toContain("peaceful 16th-century stepwell");
    expect(reason).not.toContain("Similar heritage & photography vibe");
    expect(reason).not.toContain("straight-line");
  });

  it("falls back to factual description from candidate place when not specifically mapped", () => {
    const dummyHotspot = { ...byId("amber"), id: "custom_hotspot" };
    const gatore = byId("gatore");
    const reason = synthesizeRecommendationReason(gatore, dummyHotspot, 2.5, ["heritage"]);

    expect(reason).toContain("quieter-feeling heritage alternative");
    expect(reason).toContain("carved white marble royal cenotaphs");
    expect(reason).not.toContain("straight-line");
  });
});

describe("Category and Tag Matching", () => {
  it("calculates 98% vibe match for identical tag sets", () => {
    const result = calculateTagMatch(["heritage", "photography"], ["heritage", "photography"]);
    expect(result.matched).toEqual(["heritage", "photography"]);
    expect(result.matchFraction).toBe(1);
    expect(result.vibeMatchPercentage).toBe(98);
  });

  it("calculates partial vibe match for overlapping tag sets", () => {
    const result = calculateTagMatch(
      ["heritage", "nature"],
      ["heritage", "photography"]
    );
    expect(result.matched).toEqual(["heritage"]);
    expect(result.vibeMatchPercentage).toBeGreaterThan(60);
    expect(result.vibeMatchPercentage).toBeLessThan(90);
  });

  it("handles empty or disjoint tag sets gracefully", () => {
    const result = calculateTagMatch(["shopping"], ["nature"]);
    expect(result.matched).toEqual([]);
    expect(result.matchFraction).toBe(0);
    expect(result.vibeMatchPercentage).toBe(50);
  });
});

describe("Recommendation Ranking Logic", () => {
  const amber = byId("amber"); // heritage, photography

  it("excludes the target destination itself from recommendation candidates", () => {
    const recs = rankAlternatives(amber, PLACES, { limit: 10, gemsOnly: false });
    const ids = recs.map((r) => r.place.id);
    expect(ids).not.toContain("amber");
  });

  it("restricts candidates to gems when gemsOnly is true", () => {
    const recs = rankAlternatives(amber, PLACES, { limit: 10, gemsOnly: true });
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.place.gem).toBe(true);
    }
  });

  it("filters candidates by maxDistanceKm when specified", () => {
    const recs = rankAlternatives(amber, PLACES, { maxDistanceKm: 2.0, gemsOnly: true });
    for (const rec of recs) {
      expect(rec.straightLineDistanceKm).toBeLessThanOrEqual(2.0);
    }
  });

  it("ranks geographically close and tag-similar gems at the top without ML prediction", () => {
    const recs = rankAlternatives(amber, PLACES, { limit: 3, gemsOnly: true });
    expect(recs.length).toBe(3);

    // Nearby gems in Amer cluster sharing tags (heritage, photography)
    const topIds = recs.map((r) => r.place.id);
    expect(topIds).toContain("panna");
    expect(topIds).toContain("jaigarh");

    // All distances are positive, labeled, and transit time is honestly pending
    for (const rec of recs) {
      expect(rec.straightLineDistanceKm).toBeGreaterThan(0);
      expect(rec.distanceLabel).toContain("straight-line");
      expect(rec.transitLabel).toBe("Road transit: pending routing provider");
      expect(rec.predictedCrowdScore).toBeNull();
      expect(rec.crowdStatusLabel).toBe("Simulated baseline");
      expect(rec.reason.length).toBeGreaterThan(15);
    }
  });

  it("incorporates genuine crowd predictions when a CrowdPredictor is provided", () => {
    const mockPredictor: CrowdPredictor = {
      predictCrowd(placeId: string): CrowdPredictionResult | null {
        if (placeId === "jaigarh") {
          return { score: 10, source: "ml_model", confidence: 0.9 };
        }
        if (placeId === "panna") {
          return { score: 95, source: "ml_model", confidence: 0.9 };
        }
        if (placeId === "jagat_shiromani") {
          return { score: 85, source: "ml_model", confidence: 0.85 };
        }
        return { score: 70, source: "heuristic" };
      },
    };

    const recs = rankAlternatives(amber, PLACES, {
      limit: 6,
      gemsOnly: true,
      crowdPredictor: mockPredictor,
    });

    const top = recs[0];
    expect(top).toBeDefined();
    if (top) {
      expect(top.place.id).toBe("jaigarh");
      expect(top.predictedCrowdScore).toBe(10);
      expect(top.predictionSource).toBe("ml_model");
      expect(top.crowdStatusLabel).toBe("ML prediction");
    }

    // Jaigarh (crowd 15) must rank higher than panna (crowd 95)
    const pannaIndex = recs.findIndex((r) => r.place.id === "panna");
    const jaigarhIndex = recs.findIndex((r) => r.place.id === "jaigarh");
    expect(jaigarhIndex).toBe(0);
    expect(pannaIndex).toBeGreaterThan(jaigarhIndex);
  });

  it("falls back cleanly when CrowdPredictor returns null (no prediction available)", () => {
    const unavailablePredictor: CrowdPredictor = {
      predictCrowd: () => null,
    };

    const recs = rankAlternatives(amber, PLACES, {
      limit: 3,
      gemsOnly: true,
      crowdPredictor: unavailablePredictor,
    });

    expect(recs.length).toBe(3);
    for (const rec of recs) {
      expect(rec.predictedCrowdScore).toBeNull();
      expect(rec.predictionSource).toBeUndefined();
      expect(rec.crowdStatusLabel).toBe("Simulated baseline");
    }
  });
});

describe("Hotspot-to-Alternative Sensibility Mapping", () => {
  const hotspotIds = ["amber", "nahargarh", "jalmahal", "hawa", "jantar", "citypalace", "bapu"] as const;

  it.each(hotspotIds)("produces 3 genuinely sensible alternatives for %s", (hotspotId) => {
    const hotspot = byId(hotspotId);
    const recs = rankAlternatives(hotspot, PLACES, { limit: 3, gemsOnly: true });

    expect(recs.length).toBe(3);

    for (const rec of recs) {
      // Must not recommend itself
      expect(rec.place.id).not.toBe(hotspot.id);
      // Must be a curated gem
      expect(rec.place.gem).toBe(true);
      // Must have at least 1 overlapping tag with the hotspot
      expect(rec.matchedTags.length).toBeGreaterThanOrEqual(1);
      // Straight-line distance must be reasonably within the greater Jaipur area (< 25 km)
      expect(rec.straightLineDistanceKm).toBeLessThan(25);
      // Reason must clearly explain why it is a sensible alternative
      expect(rec.reason.length).toBeGreaterThan(20);
      expect(rec.reason).not.toContain("straight-line");
      // Transit must not be fake road time
      expect(rec.transitLabel).toBe("Road transit: pending routing provider");
    }
  });

  it("Amber Fort specifically recommends Amer stepwell, Jaigarh, or Jagat Shiromani within ~1 km", () => {
    const amber = byId("amber");
    const recs = rankAlternatives(amber, PLACES, { limit: 3, gemsOnly: true });
    const topIds = recs.map((r) => r.place.id);

    // All top alternatives should be in the immediate Amer historical cluster
    const amerCluster = ["panna", "jaigarh", "jagat_shiromani"];
    const matchesCluster = topIds.some((id) => amerCluster.includes(id));
    expect(matchesCluster).toBe(true);

    // The top recommendation should be under 1 km away
    const firstRec = recs[0];
    expect(firstRec).toBeDefined();
    if (firstRec) {
      expect(firstRec.straightLineDistanceKm).toBeLessThan(1.0);
    }
  });

  it("Bapu Bazaar specifically recommends shopping and craft alternatives", () => {
    const bapu = byId("bapu");
    const recs = rankAlternatives(bapu, PLACES, { limit: 3, gemsOnly: true });

    for (const rec of recs) {
      expect(rec.matchedTags).toContain("shopping");
    }
  });
});

describe("Stage 2: Itinerary Stop Replacement & Map Integration", () => {
  const basePlan: Plan = {
    day: "Sun",
    time: "full",
    budget: 2000,
    interests: ["heritage", "photography"],
    type: "friends",
    crowd: "avoid",
    must: "amber",
  };

  it("applyStopReplacement records replacement and preserves plan settings", () => {
    const updated = applyStopReplacement(basePlan, "amber", "panna");
    expect(updated.stopReplacements).toEqual({ amber: "panna" });
    expect(updated.must).toBe("amber"); // Preserves planner setting
    expect(updated.budget).toBe(basePlan.budget);
    expect(updated.interests).toEqual(basePlan.interests);
  });

  it("removeStopReplacement removes replacement and cleans stopReplacements when empty", () => {
    const withReplacement = applyStopReplacement(basePlan, "amber", "panna");
    const reverted = removeStopReplacement(withReplacement, "amber");
    expect(reverted.stopReplacements).toBeUndefined();
    expect(reverted.must).toBe("amber");
  });

  it("resolveStop swaps destination and annotates replacement note", () => {
    const amberStop = { time: "4:00 PM", hour: 16, id: "amber" };
    const resolved = resolveStop(amberStop, { amber: "panna" });

    expect(resolved.id).toBe("panna");
    expect(resolved.note).toBe("Replaced crowded Amber Fort with Panna Meena Kund");
  });

  it("resolveStop leaves unaffected stops and food stops intact", () => {
    const hawaStop = { time: "11:00 AM", hour: 11, id: "hawa" };
    const foodStop = { time: "1:00 PM", hour: 13, id: "food", food: true };
    const replacements = { amber: "panna" };

    expect(resolveStop(hawaStop, replacements)).toEqual(hawaStop);
    expect(resolveStop(foodStop, replacements)).toEqual(foodStop);
  });

  it("buildOriginal dynamically updates stops with active replacement", () => {
    const planWithReplacement = applyStopReplacement(basePlan, "amber", "panna");
    const stops = buildOriginal(planWithReplacement);

    const stopIds = stops.map((s) => s.id);
    expect(stopIds).not.toContain("amber");
    expect(stopIds).toContain("panna");

    const pannaStop = stops.find((s) => s.id === "panna");
    expect(pannaStop?.note).toContain("Replaced crowded Amber Fort with Panna Meena Kund");
  });

  it("buildOriginal integrates replacements for hotspots not in default stops", () => {
    const planWithCityPalaceReplacement = applyStopReplacement(basePlan, "citypalace", "sisodia");
    const stops = buildOriginal(planWithCityPalaceReplacement);

    const stopIds = stops.map((s) => s.id);
    expect(stopIds).toContain("sisodia");

    const sisodiaStop = stops.find((s) => s.id === "sisodia");
    expect(sisodiaStop?.note).toContain("Added as quieter alternative to crowded City Palace");
  });

  it("buildSmart replaces crowded stops and prevents duplicate stops", () => {
    const planWithReplacement = applyStopReplacement(basePlan, "amber", "panna");
    const smartStops = buildSmart(planWithReplacement);

    // Stops should be unique
    const stopIds = smartStops.map((s) => s.id);
    const uniqueIds = new Set(stopIds);
    expect(uniqueIds.size).toBe(stopIds.length);
    expect(stopIds).toContain("panna");
  });

  it("verifies all recommended gems have valid coordinates for Leaflet LiveMap markers", () => {
    for (const place of PLACES) {
      if (place.gem) {
        expect(place.lat).toBeGreaterThan(26.8);
        expect(place.lat).toBeLessThan(27.1);
        expect(place.lng).toBeGreaterThan(75.6);
        expect(place.lng).toBeLessThan(76.0);
        expect(byId(place.id)).toBe(place);
      }
    }
  });
});
