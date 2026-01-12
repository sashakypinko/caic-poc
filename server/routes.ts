import type { Express } from "express";
import { type Server } from "http";
import { 
  fetchReportsRequestSchema,
  chatRequestSchema,
  type ReportResponse,
} from "@shared/schema";
import { aggregateReports, collectTexts } from "./lib/processing";
import { progressTracker } from "./lib/progress";
import { fetchCAICReports, isValidDateFormat } from "./lib/caic";
import { createOpenAIClient, synthesizeSummary, chatWithContext } from "./lib/xai";

const openai = createOpenAIClient();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/progress/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    
    res.write(`data: ${JSON.stringify({ stage: "connected", progress: 0, message: "Connected" })}\n\n`);
    
    progressTracker.addClient(sessionId, res);
    
    req.on("close", () => {
      progressTracker.removeClient(sessionId);
    });
  });
  
  app.post("/api/reports", async (req, res) => {
    const requestStartTime = Date.now();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Request] POST /api/reports at ${new Date().toISOString()}`);
    console.log(`${"=".repeat(60)}`);
    
    try {
      const parseResult = fetchReportsRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.log(`[Request] Validation failed: ${parseResult.error.errors.map(e => e.message).join(", ")}`);
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors.map(e => e.message).join(", ")
        });
      }
      
      const { date } = parseResult.data;
      const sessionId = req.headers["x-session-id"] as string | undefined;
      console.log(`[Request] Date: ${date}, SessionID: ${sessionId || "none"}`);

      if (!isValidDateFormat(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      console.log(`[Request] Stage 1: Fetching CAIC reports...`);
      if (sessionId) progressTracker.sendProgress(sessionId, "fetching", 10, "Fetching field reports from CAIC...");
      const reports = await fetchCAICReports(date);
      if (sessionId) progressTracker.sendProgress(sessionId, "fetching", 25, `Retrieved ${reports.length} reports`);
      
      console.log(`[Request] Stage 2: Aggregating data...`);
      if (sessionId) progressTracker.sendProgress(sessionId, "aggregating", 30, "Aggregating report data...");
      const aggregatedData = aggregateReports(reports);
      if (sessionId) progressTracker.sendProgress(sessionId, "aggregating", 40, "Data aggregation complete");
      
      console.log(`[Request] Stage 3: Collecting texts for synthesis...`);
      const texts = collectTexts(reports);
      
      console.log(`[Request] Stage 4: Synthesizing AI summaries...`);
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 45, "Generating observation summary...");
      const obsResult = await synthesizeSummary(openai, texts.observations, "Observation");
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 60, obsResult.cached ? "Observation summary loaded from cache" : "Observation summary generated");
      
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 65, "Generating snowpack summary...");
      const snowResult = await synthesizeSummary(openai, texts.snowpack, "Snowpack");
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 80, snowResult.cached ? "Snowpack summary loaded from cache" : "Snowpack summary generated");
      
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 85, "Generating weather summary...");
      const weatherResult = await synthesizeSummary(openai, texts.weather, "Weather");
      if (sessionId) progressTracker.sendProgress(sessionId, "synthesizing", 95, weatherResult.cached ? "Weather summary loaded from cache" : "Weather summary generated");
      
      if (sessionId) progressTracker.sendProgress(sessionId, "complete", 100, "Report aggregation complete");

      const response: ReportResponse = {
        date,
        aggregatedData,
        summaries: {
          observationSummary: obsResult.summary,
          snowpackSummary: snowResult.summary,
          weatherSummary: weatherResult.summary,
        },
      };

      const totalElapsed = Date.now() - requestStartTime;
      console.log(`[Request] Stage 5: Complete`);
      console.log(`[Request] Total request time: ${totalElapsed}ms`);
      console.log(`${"=".repeat(60)}\n`);

      res.json(response);
    } catch (error) {
      const totalElapsed = Date.now() - requestStartTime;
      console.error(`[Request] ERROR after ${totalElapsed}ms:`, error);
      console.log(`${"=".repeat(60)}\n`);
      res.status(500).json({ error: "Failed to fetch and process reports" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    console.log(`[Chat] POST /api/chat at ${new Date().toISOString()}`);
    const startTime = Date.now();
    
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.log(`[Chat] Validation failed: ${parseResult.error.errors.map(e => e.message).join(", ")}`);
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors.map(e => e.message).join(", ")
        });
      }
      
      const { message, context, summaries } = parseResult.data;
      console.log(`[Chat] User message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
      console.log(`[Chat] Context provided: ${context ? 'yes' : 'no'}, Summaries provided: ${summaries ? 'yes' : 'no'}`);

      const response = await chatWithContext(openai, message, context, summaries);
      
      const elapsed = Date.now() - startTime;
      console.log(`[Chat] Response generated in ${elapsed}ms (${response.length} chars)`);
      
      res.json({ response });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[Chat] ERROR after ${elapsed}ms:`, error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  return httpServer;
}
