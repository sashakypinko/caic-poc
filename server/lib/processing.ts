import type { AggregatedData, FieldReport } from "@shared/schema";

export function mapElevation(
  elevation: string | null | undefined,
): "aboveTreeline" | "nearTreeline" | "belowTreeline" | null {
  if (!elevation) return null;

  let decoded = elevation
    .replaceAll("&#62;", ">")
    .replaceAll("&#60;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .trim()
    .toUpperCase();

  if (
    decoded.includes(">TL") ||
    decoded.startsWith(">") ||
    decoded.includes("ATL") ||
    decoded.includes("ABOVE") ||
    decoded.includes("ALPINE")
  ) {
    return "aboveTreeline";
  }

  if (
    decoded.includes("<TL") ||
    decoded.startsWith("<") ||
    decoded.includes("BTL") ||
    decoded.includes("BELOW") ||
    decoded.includes("SUB")
  ) {
    return "belowTreeline";
  }

  if (
    decoded === "TL" ||
    decoded.includes("NTL") ||
    decoded.includes("NEAR") ||
    decoded.includes("TREELINE")
  ) {
    return "nearTreeline";
  }

  return null;
}

export function mapAspect(
  aspect: string | null | undefined,
): keyof AggregatedData["avalanchesByAspect"] | null {
  if (!aspect) return null;
  const upper = aspect.toUpperCase().trim();

  const twoLetterAspects = ["NE", "NW", "SE", "SW"] as const;
  for (const a of twoLetterAspects) {
    const regex = new RegExp(`\\b${a}\\b`);
    if (upper === a || regex.test(upper)) {
      return a;
    }
  }

  const singleLetterAspects = ["N", "E", "S", "W"] as const;
  for (const a of singleLetterAspects) {
    const regex = new RegExp(`\\b${a}\\b`);
    if (upper === a || regex.test(upper)) {
      return a;
    }
  }

  return null;
}

export function mapInstabilityLevel(
  value: string | null | undefined,
): "None" | "Minor" | "Moderate" | "Major" | "Severe" {
  if (!value) return "None";
  const lower = value.toLowerCase();
  if (lower.includes("none") || lower === "no" || lower === "") return "None";
  if (
    lower.includes("minor") ||
    lower.includes("slight") ||
    lower.includes("light")
  )
    return "Minor";
  if (lower.includes("moderate") || lower.includes("medium")) return "Moderate";
  if (
    lower.includes("major") ||
    lower.includes("heavy") ||
    lower.includes("significant")
  )
    return "Major";
  if (
    lower.includes("severe") ||
    lower.includes("extreme") ||
    lower.includes("widespread")
  )
    return "Severe";
  return "None";
}

export function aggregateReports(reports: FieldReport[]): AggregatedData {
  const aggregated: AggregatedData = {
    totalReports: reports.length,
    reportsWithAvalanches: 0,
    totalAvalanches: 0,
    avalanchesByElevation: {
      aboveTreeline: 0,
      nearTreeline: 0,
      belowTreeline: 0,
    },
    avalanchesByAspect: {
      N: 0,
      NE: 0,
      E: 0,
      SE: 0,
      S: 0,
      SW: 0,
      W: 0,
      NW: 0,
    },
    crackingCounts: {
      None: 0,
      Minor: 0,
      Moderate: 0,
      Major: 0,
      Severe: 0,
    },
    collapsingCounts: {
      None: 0,
      Minor: 0,
      Moderate: 0,
      Major: 0,
      Severe: 0,
    },
  };

  for (const report of reports) {
    const avalancheCount =
      report.avalanche_observations?.length ||
      report.avalanche_observations_count ||
      0;
    if (avalancheCount > 0) {
      aggregated.reportsWithAvalanches++;
    }
    aggregated.totalAvalanches += avalancheCount;

    for (const avy of report.avalanche_observations || []) {
      const elevation = mapElevation(avy.elevation);
      if (elevation) {
        aggregated.avalanchesByElevation[elevation]++;
      }

      const aspect = mapAspect(avy.aspect);
      if (aspect) {
        aggregated.avalanchesByAspect[aspect]++;
      }
    }

    for (const obs of report.snowpack_observations || []) {
      const crackingLevel = mapInstabilityLevel(obs.cracking);
      aggregated.crackingCounts[crackingLevel]++;

      const collapsingLevel = mapInstabilityLevel(obs.collapsing);
      aggregated.collapsingCounts[collapsingLevel]++;
    }

    if (
      !report.snowpack_observations ||
      report.snowpack_observations.length === 0
    ) {
      aggregated.crackingCounts.None++;
      aggregated.collapsingCounts.None++;
    }
  }

  return aggregated;
}

function pushIfPresent(arr: string[], text: string | null | undefined): void {
  const trimmed = text?.trim();
  if (trimmed) {
    arr.push(trimmed);
  }
}

function extractComments(
  arr: string[],
  observations: Array<{ comments?: string | null }> | null | undefined,
): void {
  for (const obs of observations || []) {
    pushIfPresent(arr, obs.comments);
  }
}

export function collectTexts(reports: FieldReport[]): {
  observations: string[];
  snowpack: string[];
  weather: string[];
} {
  const observations: string[] = [];
  const snowpack: string[] = [];
  const weather: string[] = [];

  for (const report of reports) {
    pushIfPresent(observations, report.observation_summary || report.description);
    pushIfPresent(snowpack, report.snowpack_detail?.description);
    extractComments(snowpack, report.snowpack_observations);
    pushIfPresent(weather, report.weather_detail?.description);
    extractComments(weather, report.weather_observations);
  }

  return { observations, snowpack, weather };
}
