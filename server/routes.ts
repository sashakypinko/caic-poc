import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { z } from "zod";
import { 
  fetchReportsRequestSchema,
  chatRequestSchema,
  type AggregatedData, 
  type SynthesizedSummaries, 
  type FieldReport, 
  type ReportResponse,
} from "@shared/schema";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

// Fetch reports from CAIC API
async function fetchCAICReports(date: string): Promise<FieldReport[]> {
  const startDate = `${date}T00:00:01.000Z`;
  const endDate = `${date}T23:59:59.000Z`;
  
  const url = `https://api.avalanche.state.co.us/api/v2/observation_reports?r[observed_at_gteq]=${encodeURIComponent(startDate)}&r[observed_at_lteq]=${encodeURIComponent(endDate)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CAIC API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data as FieldReport[];
}

// Map elevation strings to standard bands
function mapElevation(elevation: string | null | undefined): "aboveTreeline" | "nearTreeline" | "belowTreeline" | null {
  if (!elevation) return null;
  const upper = elevation.toUpperCase();
  if (upper.includes("ATL") || upper === "TL" || upper.includes("ABOVE") || upper.includes("ALPINE")) {
    return "aboveTreeline";
  }
  if (upper.includes("NTL") || upper.includes("NEAR") || upper.includes("TREELINE")) {
    return "nearTreeline";
  }
  if (upper.includes("BTL") || upper.includes("BELOW") || upper.includes("SUB")) {
    return "belowTreeline";
  }
  // Default treeline mapping for common codes
  if (upper === "TL") return "nearTreeline";
  return null;
}

// Map aspect strings to standard compass directions
function mapAspect(aspect: string | null | undefined): keyof AggregatedData["avalanchesByAspect"] | null {
  if (!aspect) return null;
  const upper = aspect.toUpperCase().trim();
  const aspects = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  for (const a of aspects) {
    if (upper === a || upper.startsWith(a + " ") || upper.includes(a)) {
      return a;
    }
  }
  return null;
}

// Map instability level to standard categories
function mapInstabilityLevel(value: string | null | undefined): "None" | "Minor" | "Moderate" | "Major" | "Severe" {
  if (!value) return "None";
  const lower = value.toLowerCase();
  if (lower.includes("none") || lower === "no" || lower === "") return "None";
  if (lower.includes("minor") || lower.includes("slight") || lower.includes("light")) return "Minor";
  if (lower.includes("moderate") || lower.includes("medium")) return "Moderate";
  if (lower.includes("major") || lower.includes("heavy") || lower.includes("significant")) return "Major";
  if (lower.includes("severe") || lower.includes("extreme") || lower.includes("widespread")) return "Severe";
  return "None";
}

// Aggregate data from reports
function aggregateReports(reports: FieldReport[]): AggregatedData {
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
      N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0,
    },
    crackingCounts: {
      None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0,
    },
    collapsingCounts: {
      None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0,
    },
  };

  for (const report of reports) {
    // Count reports with avalanches
    const avalancheCount = report.avalanche_observations?.length || report.avalanche_observations_count || 0;
    if (avalancheCount > 0) {
      aggregated.reportsWithAvalanches++;
    }
    aggregated.totalAvalanches += avalancheCount;

    // Aggregate avalanche observations
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

    // Aggregate snowpack observations (cracking/collapsing)
    for (const obs of report.snowpack_observations || []) {
      const crackingLevel = mapInstabilityLevel(obs.cracking);
      aggregated.crackingCounts[crackingLevel]++;
      
      const collapsingLevel = mapInstabilityLevel(obs.collapsing);
      aggregated.collapsingCounts[collapsingLevel]++;
    }

    // If no snowpack observations, count as None
    if (!report.snowpack_observations || report.snowpack_observations.length === 0) {
      aggregated.crackingCounts.None++;
      aggregated.collapsingCounts.None++;
    }
  }

  return aggregated;
}

// Collect text for synthesis
function collectTexts(reports: FieldReport[]): {
  observations: string[];
  snowpack: string[];
  weather: string[];
} {
  const observations: string[] = [];
  const snowpack: string[] = [];
  const weather: string[] = [];

  for (const report of reports) {
    // Observation summaries
    const obsText = report.observation_summary || report.description;
    if (obsText && obsText.trim()) {
      observations.push(obsText.trim());
    }

    // Snowpack
    const snowpackText = report.snowpack_detail?.description;
    if (snowpackText && snowpackText.trim()) {
      snowpack.push(snowpackText.trim());
    }
    for (const obs of report.snowpack_observations || []) {
      if (obs.comments && obs.comments.trim()) {
        snowpack.push(obs.comments.trim());
      }
    }

    // Weather
    const weatherText = report.weather_detail?.description;
    if (weatherText && weatherText.trim()) {
      weather.push(weatherText.trim());
    }
    for (const obs of report.weather_observations || []) {
      if (obs.comments && obs.comments.trim()) {
        weather.push(obs.comments.trim());
      }
    }
  }

  return { observations, snowpack, weather };
}

// Synthesize summary using xAI Grok
async function synthesizeSummary(texts: string[], category: string): Promise<string> {
  if (texts.length === 0) {
    return `No ${category.toLowerCase()} data available for this date.`;
  }

  const combinedText = texts.slice(0, 50).join("\n---\n"); // Limit to prevent token overflow
  
  try {
    const response = await openai.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are an expert avalanche forecaster assistant. Synthesize the following ${category} observations into a concise summary identifying common themes, patterns, and notable findings. Be professional and factual. Keep the summary to 2-3 paragraphs.`
        },
        {
          role: "user",
          content: `Please synthesize common themes from these ${category} observations:\n\n${combinedText}`
        }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || `Unable to synthesize ${category.toLowerCase()} summary.`;
  } catch (error) {
    console.error(`Error synthesizing ${category}:`, error);
    return `Error generating ${category.toLowerCase()} summary. Please try again.`;
  }
}

// Chat with context
async function chatWithContext(
  message: string, 
  context?: AggregatedData, 
  summaries?: SynthesizedSummaries
): Promise<string> {
  const contextJson = JSON.stringify({ aggregatedData: context, summaries }, null, 2);
  
  try {
    const response = await openai.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are an expert avalanche forecaster assistant. You have access to aggregated field report data for a specific date. Answer questions accurately based on the provided data. Be concise and factual.

Here is the aggregated data context:
${contextJson}`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Error processing your question. Please try again.";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Fetch and aggregate reports for a date
  app.post("/api/reports", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const parseResult = fetchReportsRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors.map(e => e.message).join(", ")
        });
      }
      
      const { date } = parseResult.data;

      // Additional date format validation
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Fetch reports from CAIC API
      const reports = await fetchCAICReports(date);
      
      // Aggregate data
      const aggregatedData = aggregateReports(reports);
      
      // Collect texts for synthesis
      const texts = collectTexts(reports);
      
      // Synthesize summaries in parallel
      const [observationSummary, snowpackSummary, weatherSummary] = await Promise.all([
        synthesizeSummary(texts.observations, "Observation"),
        synthesizeSummary(texts.snowpack, "Snowpack"),
        synthesizeSummary(texts.weather, "Weather"),
      ]);

      const response: ReportResponse = {
        date,
        aggregatedData,
        summaries: {
          observationSummary,
          snowpackSummary,
          weatherSummary,
        },
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch and process reports" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors.map(e => e.message).join(", ")
        });
      }
      
      const { message, context, summaries } = parseResult.data;

      const response = await chatWithContext(message, context, summaries);
      
      res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  return httpServer;
}
