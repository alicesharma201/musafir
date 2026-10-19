import type { Place } from "./jaipur-data";

/**
 * Result returned by a crowd prediction service or model.
 */
export interface CrowdPredictionResult {
  /** Predicted crowd intensity on a scale of 0 (deserted) to 100 (at/exceeding capacity) */
  score: number;
  /** Provenance of the prediction */
  source: "ml_model" | "heuristic" | "live_pulse";
  /** Optional confidence score between 0 and 1 */
  confidence?: number | undefined;
}

/**
 * Contextual features required for crowd prediction.
 */
export interface CrowdPredictorContext {
  day?: string | undefined;
  hour?: number | undefined;
  festival?: boolean | undefined;
  weather?: ("clear" | "hot" | "rain") | undefined;
}

/**
 * Standard typed interface for the crowd prediction provider.
 * The ML team or backend provider must implement this interface.
 */
export interface CrowdPredictor {
  /**
   * Predicts crowd pressure for a destination given a context.
   * Returns null if no genuine prediction or reliable observation is available.
   */
  predictCrowd(placeId: string, context?: CrowdPredictorContext): CrowdPredictionResult | null;
}

/**
 * Options to customize recommendation filtering and ranking.
 */
export interface RecommendationOptions {
  /** Optional explicit user interests (e.g. ['heritage', 'nature']) to supplement target tags */
  userInterests?: string[] | undefined;
  /** Optional maximum straight-line radius in kilometers */
  maxDistanceKm?: number | undefined;
  /** If true, only candidates marked with gem: true are returned (default: true) */
  gemsOnly?: boolean | undefined;
  /** Optional crowd prediction provider */
  crowdPredictor?: CrowdPredictor | undefined;
  /** Query context for crowd prediction */
  context?: CrowdPredictorContext | undefined;
  /** Maximum number of recommendations to return (default: 3) */
  limit?: number | undefined;
  /** Custom weighting factors for composite scoring */
  weights?: {
    interest?: number | undefined;
    distance?: number | undefined;
    crowd?: number | undefined;
  } | undefined;
}

/**
 * Detailed recommendation result with transparent breakdown of factors.
 */
export interface ScoredRecommendation {
  place: Place;
  straightLineDistanceKm: number;
  distanceLabel: string;
  transitLabel: string;
  matchedTags: string[];
  vibeMatchPercentage: number;
  predictedCrowdScore: number | null;
  predictionSource?: "ml_model" | "heuristic" | "live_pulse" | undefined;
  crowdStatusLabel: string;
  reason: string;
  compositeScore: number;
}

/**
 * Calculates straight-line (geodesic) distance between two coordinate pairs using the Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateStraightLineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers into an accurate straight-line label.
 */
export function formatStraightLineDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m straight-line`;
  }
  return `${distanceKm.toFixed(1)} km straight-line`;
}

/**
 * Formats a distance in kilometers into a clean, compact label (e.g. "670 m" or "1.6 km")
 * without internal jargon or "straight-line" wording.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Curated destination-specific recommendation reasons explaining why each alternative
 * is a genuine, quieter substitute for the crowded hotspot.
 */
const SPECIFIC_REASONS: Record<string, Record<string, string>> = {
  amber: {
    jaigarh: "A quieter hilltop fort alternative above Amer, featuring spacious battlements and the historic Jaivana cannon without the tourist rush.",
    panna: "A peaceful 16th-century stepwell just minutes from Amer Fort, featuring striking symmetrical geometric stairs.",
    jagat_shiromani: "A serene 16th-century carved stone temple and courtyard right beside Amer Fort, free from tour group crowds.",
    gatore: "A tranquil heritage alternative featuring intricately carved white marble royal cenotaphs beneath the Nahargarh hills.",
  },
  nahargarh: {
    jaigarh: "A quieter hilltop fort alternative featuring spacious ridge ramparts and panoramic views without the Padao sunset crush.",
    gatore: "A peaceful heritage alternative featuring intricately carved marble cenotaphs nestled below the Nahargarh hills.",
    kanak: "A serene landscaped valley garden alternative nestled between the Nahargarh and Amer hills.",
    jalmahal: "A scenic waterfront viewpoint along Man Sagar lake with panoramic mountain backdrops.",
  },
  jalmahal: {
    kanak: "A tranquil landscaped garden alternative near the lake hills, offering peaceful walking paths and greenery.",
    vidyadhar: "A serene terraced garden alternative with historic water channels and pavilions commemorating Jaipur's master architect.",
    sisodia: "A peaceful tiered garden palace alternative along Agra Road featuring cascading water channels and historic murals.",
  },
  hawa: {
    albert: "A spacious Indo-Saracenic museum alternative in Ram Niwas Garden with extensive artefacts away from street congestion.",
    patrika: "A quieter architectural photography stop at Jawahar Circle featuring vibrant hand-painted Rajasthani gateways.",
    gatore: "A peaceful marble cenotaph courtyard alternative away from Badi Chaupar street congestion.",
  },
  jantar: {
    citypalace: "A spacious royal complex right next door, offering shaded courtyards and curated museum galleries.",
    anokhi: "A quiet, shaded cultural museum in a restored haveli dedicated to traditional Rajasthani block printing.",
    jkk: "A spacious modern cultural centre designed by Charles Correa with unhurried art galleries and open courtyards.",
  },
  citypalace: {
    albert: "A grand Indo-Saracenic museum alternative set in Ram Niwas Garden with extensive art and historical exhibits.",
    gatore: "A tranquil royal cenotaph sanctuary featuring intricately carved white marble chhatris in a secluded valley.",
    jkk: "A relaxed, contemporary cultural centre featuring art galleries, craft exhibitions, and the Indian Coffee House.",
  },
  bapu: {
    tripolia: "A traditional Old City market alternative specializing in authentic lacquer bangles, brassware, and iron crafts with fewer tour buses.",
    sanganer: "An authentic artisanal craft alternative, home to traditional Rajasthani hand-block textile printing and handmade paper.",
    anokhi: "A relaxed textile craft museum and workshop in Amer celebrating traditional block-print heritage.",
  },
};

/**
 * Synthesizes a factual, destination-specific recommendation reason explaining why
 * the candidate is a sensible alternative to the selected crowded attraction.
 */
export function synthesizeRecommendationReason(
  candidate: Place,
  target: Place,
  _distanceKm?: number,
  matchedTags: string[] = []
): string {
  const specific = SPECIFIC_REASONS[target.id]?.[candidate.id];
  if (specific) {
    return specific;
  }

  const primaryTag = matchedTags[0] ?? candidate.tags[0] ?? "cultural";
  const desc = candidate.update
    ? candidate.update.charAt(0).toLowerCase() + candidate.update.slice(1)
    : "peaceful surroundings";
  return `A quieter-feeling ${primaryTag} alternative featuring ${desc}.`;
}

/**
 * Calculates category/interest match between a candidate's tags and target reference tags.
 */
export function calculateTagMatch(
  candidateTags: string[],
  referenceTags: string[]
): { matched: string[]; matchFraction: number; vibeMatchPercentage: number } {
  if (referenceTags.length === 0 || candidateTags.length === 0) {
    return { matched: [], matchFraction: 0, vibeMatchPercentage: 50 };
  }

  const refSet = new Set(referenceTags);
  const matched = candidateTags.filter((tag) => refSet.has(tag));

  // Jaccard similarity across both sets
  const unionSet = new Set([...referenceTags, ...candidateTags]);
  const jaccard = unionSet.size > 0 ? matched.length / unionSet.size : 0;

  // Coverage of reference tags
  const coverage = matched.length / referenceTags.length;

  // Composite match fraction: 60% coverage, 40% Jaccard
  const matchFraction = 0.6 * coverage + 0.4 * jaccard;

  // Scaled vibe match percentage (50% base for neutral, up to 98%)
  const vibeMatchPercentage = Math.min(98, Math.round(50 + matchFraction * 48));

  return { matched, matchFraction, vibeMatchPercentage };
}

/**
 * Ranks candidate destinations against a target hotspot using category match,
 * straight-line distance, affordability, and predicted crowd pressure (when available).
 */
export function rankAlternatives(
  targetPlace: Place,
  candidatePool: Place[],
  options: RecommendationOptions = {}
): ScoredRecommendation[] {
  const {
    userInterests = [],
    maxDistanceKm,
    gemsOnly = true,
    crowdPredictor,
    context,
    limit = 3,
    weights = {},
  } = options;

  const wInterest = weights.interest ?? 0.50;
  const wDistance = weights.distance ?? 0.25;
  const wCrowd = weights.crowd ?? 0.25;

  // Reference tags: target place tags combined with any explicit user interests
  const referenceTags = Array.from(new Set([...targetPlace.tags, ...userInterests]));

  // 1. Filter candidates:
  // - Exclude target place itself
  // - Optionally restrict to gems
  // - Respect explicit maxDistanceKm if specified
  const filteredCandidates = candidatePool.filter((cand) => {
    if (cand.id === targetPlace.id) return false;
    if (gemsOnly && !cand.gem) return false;

    if (maxDistanceKm !== undefined) {
      const dist = calculateStraightLineDistanceKm(
        targetPlace.lat,
        targetPlace.lng,
        cand.lat,
        cand.lng
      );
      if (dist > maxDistanceKm) return false;
    }

    return true;
  });

  // 2. Score each candidate:
  const scored: ScoredRecommendation[] = filteredCandidates.map((cand) => {
    const distanceKm = calculateStraightLineDistanceKm(
      targetPlace.lat,
      targetPlace.lng,
      cand.lat,
      cand.lng
    );

    const { matched, matchFraction, vibeMatchPercentage } = calculateTagMatch(
      cand.tags,
      referenceTags
    );

    // Distance decay function: 1 at 0km, 0.5 at 4km, decaying asymptotically towards 0
    const proximityScore = 1 / (1 + distanceKm / 4);

    // Crowd prediction query
    const crowdResult = crowdPredictor?.predictCrowd(cand.id, context) ?? null;
    const predictedCrowd = crowdResult?.score ?? null;

    let crowdStatusLabel = "Simulated baseline";
    if (crowdResult?.source === "ml_model") {
      crowdStatusLabel = "ML prediction";
    } else if (crowdResult?.source === "live_pulse") {
      crowdStatusLabel = "Community observation";
    }

    // Composite scoring
    let compositeScore: number;
    if (predictedCrowd !== null) {
      const crowdFavorability = Math.max(0, Math.min(1, (100 - predictedCrowd) / 100));
      compositeScore =
        wInterest * matchFraction +
        wDistance * proximityScore +
        wCrowd * crowdFavorability;
    } else {
      // Re-normalize weights when no crowd prediction is available
      const totalWeight = wInterest + wDistance;
      compositeScore =
        (wInterest * matchFraction + wDistance * proximityScore) / totalWeight;
    }

    const reason = synthesizeRecommendationReason(cand, targetPlace, distanceKm, matched);

    const rec: ScoredRecommendation = {
      place: cand,
      straightLineDistanceKm: Math.round(distanceKm * 100) / 100,
      distanceLabel: formatStraightLineDistance(distanceKm),
      transitLabel: "Road transit: pending routing provider",
      matchedTags: matched,
      vibeMatchPercentage,
      predictedCrowdScore: predictedCrowd,
      crowdStatusLabel,
      reason,
      compositeScore,
    };

    if (crowdResult?.source !== undefined) {
      rec.predictionSource = crowdResult.source;
    }

    return rec;
  });

  // 3. Sort:
  // Primary: compositeScore descending
  // Tie-breaker: straight-line distance ascending
  scored.sort((a, b) => {
    if (Math.abs(b.compositeScore - a.compositeScore) > 0.001) {
      return b.compositeScore - a.compositeScore;
    }
    return a.straightLineDistanceKm - b.straightLineDistanceKm;
  });

  return scored.slice(0, limit);
}

/**
 * Applies a destination replacement to an active itinerary plan,
 * swapping the crowded hotspot for the chosen alternative.
 */
export function applyStopReplacement<
  T extends { must?: string; stopReplacements?: Record<string, string> | undefined },
>(plan: T, hotspotId: string, gemId: string): T {
  const replacements = { ...(plan.stopReplacements ?? {}) };
  replacements[hotspotId] = gemId;

  return {
    ...plan,
    stopReplacements: replacements,
  };
}

/**
 * Removes a destination replacement from an active itinerary plan,
 * reverting that hotspot back to its original destination.
 */
export function removeStopReplacement<
  T extends { must?: string; stopReplacements?: Record<string, string> | undefined },
>(plan: T, hotspotId: string): T {
  const replacements = { ...(plan.stopReplacements ?? {}) };
  delete replacements[hotspotId];

  return {
    ...plan,
    stopReplacements: Object.keys(replacements).length > 0 ? replacements : undefined,
  };
}
