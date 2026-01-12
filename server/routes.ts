import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { z } from "zod";
import { createHash } from "crypto";
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

// In-memory cache for xAI responses
const xaiCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashPayload(payload: object): string {
  const json = JSON.stringify(payload);
  return createHash("sha256").update(json).digest("hex");
}

function getCachedResponse(hash: string): string | null {
  const cached = xaiCache.get(hash);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }
  if (cached) {
    xaiCache.delete(hash); // Expired
  }
  return null;
}

function setCachedResponse(hash: string, response: string): void {
  xaiCache.set(hash, { response, timestamp: Date.now() });
}

// Progress tracking for SSE
type ProgressClient = {
  res: Response;
  sessionId: string;
};
const progressClients = new Map<string, ProgressClient>();

function sendProgress(sessionId: string, stage: string, progress: number, message: string): void {
  const client = progressClients.get(sessionId);
  if (client) {
    client.res.write(`data: ${JSON.stringify({ stage, progress, message })}\n\n`);
  }
}

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
// CAIC uses HTML entities: &#62;TL (>TL above treeline), TL (at treeline), &#60;TL (<TL below treeline)
function mapElevation(elevation: string | null | undefined): "aboveTreeline" | "nearTreeline" | "belowTreeline" | null {
  if (!elevation) return null;
  
  // Decode HTML entities first: &#62; -> >, &#60; -> <
  let decoded = elevation
    .replace(/&#62;/g, ">")
    .replace(/&#60;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .trim()
    .toUpperCase();
  
  // Check for above treeline: >TL, ATL, ABOVE
  if (decoded.includes(">TL") || decoded.startsWith(">") || decoded.includes("ATL") || decoded.includes("ABOVE") || decoded.includes("ALPINE")) {
    return "aboveTreeline";
  }
  
  // Check for below treeline: <TL, BTL, BELOW
  if (decoded.includes("<TL") || decoded.startsWith("<") || decoded.includes("BTL") || decoded.includes("BELOW") || decoded.includes("SUB")) {
    return "belowTreeline";
  }
  
  // Plain TL or NTL = near treeline (at treeline)
  if (decoded === "TL" || decoded.includes("NTL") || decoded.includes("NEAR") || decoded.includes("TREELINE")) {
    return "nearTreeline";
  }
  
  return null;
}

// Map aspect strings to standard compass directions
// Check longest aspects first to prevent prefix collisions (NW before N, etc.)
function mapAspect(aspect: string | null | undefined): keyof AggregatedData["avalanchesByAspect"] | null {
  if (!aspect) return null;
  const upper = aspect.toUpperCase().trim();
  
  // Use word boundary regex to match exact compass directions
  // Check two-letter aspects first to avoid N matching NW, etc.
  const twoLetterAspects = ["NE", "NW", "SE", "SW"] as const;
  for (const a of twoLetterAspects) {
    const regex = new RegExp(`\\b${a}\\b`);
    if (upper === a || regex.test(upper)) {
      return a;
    }
  }
  
  // Then check single-letter aspects
  const singleLetterAspects = ["N", "E", "S", "W"] as const;
  for (const a of singleLetterAspects) {
    const regex = new RegExp(`\\b${a}\\b`);
    if (upper === a || regex.test(upper)) {
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

// Synthesize summary using xAI Grok with caching
async function synthesizeSummary(texts: string[], category: string): Promise<{ summary: string; cached: boolean }> {
  if (texts.length === 0) {
    return { summary: `No ${category.toLowerCase()} data available for this date.`, cached: false };
  }

  const combinedText = texts.slice(0, 50).join("\n---\n"); // Limit to prevent token overflow
  
  // Create cache key from payload
  const payload = {
    type: "synthesize",
    category,
    texts: combinedText,
  };
  const cacheKey = hashPayload(payload);
  
  // Check cache first
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return { summary: cached, cached: true };
  }
  
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

    const summary = response.choices[0].message.content || `Unable to synthesize ${category.toLowerCase()} summary.`;
    
    // Cache the response
    setCachedResponse(cacheKey, summary);
    
    return { summary, cached: false };
  } catch (error) {
    console.error(`Error synthesizing ${category}:`, error);
    return { summary: `Error generating ${category.toLowerCase()} summary. Please try again.`, cached: false };
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
  
  // SSE endpoint for progress tracking
  app.get("/api/progress/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ stage: "connected", progress: 0, message: "Connected" })}\n\n`);
    
    // Store the client
    progressClients.set(sessionId, { res, sessionId });
    
    // Clean up on close
    req.on("close", () => {
      progressClients.delete(sessionId);
    });
  });
  
  // Fetch and aggregate reports for a date with progress tracking
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
      const sessionId = req.headers["x-session-id"] as string | undefined;

      // Additional date format validation
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Stage 1: Fetch reports from CAIC API
      if (sessionId) sendProgress(sessionId, "fetching", 10, "Fetching field reports from CAIC...");
      const reports = await fetchCAICReports(date);
      if (sessionId) sendProgress(sessionId, "fetching", 25, `Retrieved ${reports.length} reports`);
      
      // Stage 2: Aggregate data
      if (sessionId) sendProgress(sessionId, "aggregating", 30, "Aggregating report data...");
      const aggregatedData = aggregateReports(reports);
      if (sessionId) sendProgress(sessionId, "aggregating", 40, "Data aggregation complete");
      
      // Stage 3: Collect texts for synthesis
      const texts = collectTexts(reports);
      
      // Stage 4: Synthesize summaries
      if (sessionId) sendProgress(sessionId, "synthesizing", 45, "Generating observation summary...");
      const obsResult = await synthesizeSummary(texts.observations, "Observation");
      if (sessionId) sendProgress(sessionId, "synthesizing", 60, obsResult.cached ? "Observation summary loaded from cache" : "Observation summary generated");
      
      if (sessionId) sendProgress(sessionId, "synthesizing", 65, "Generating snowpack summary...");
      const snowResult = await synthesizeSummary(texts.snowpack, "Snowpack");
      if (sessionId) sendProgress(sessionId, "synthesizing", 80, snowResult.cached ? "Snowpack summary loaded from cache" : "Snowpack summary generated");
      
      if (sessionId) sendProgress(sessionId, "synthesizing", 85, "Generating weather summary...");
      const weatherResult = await synthesizeSummary(texts.weather, "Weather");
      if (sessionId) sendProgress(sessionId, "synthesizing", 95, weatherResult.cached ? "Weather summary loaded from cache" : "Weather summary generated");
      
      // Stage 5: Complete
      if (sessionId) sendProgress(sessionId, "complete", 100, "Report aggregation complete");

      const response: ReportResponse = {
        date,
        aggregatedData,
        summaries: {
          observationSummary: obsResult.summary,
          snowpackSummary: snowResult.summary,
          weatherSummary: weatherResult.summary,
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
