import OpenAI from "openai";
import type { AggregatedData, SynthesizedSummaries } from "@shared/schema";
import { xaiCache } from "./cache";

export function createOpenAIClient(apiKey?: string): OpenAI {
  return new OpenAI({ 
    baseURL: "https://api.x.ai/v1", 
    apiKey: apiKey || process.env.XAI_API_KEY 
  });
}

export interface SynthesizeResult {
  summary: string;
  cached: boolean;
}

export async function synthesizeSummary(
  client: OpenAI,
  texts: string[], 
  category: string
): Promise<SynthesizeResult> {
  console.log(`[xAI] Synthesizing ${category} summary from ${texts.length} texts`);
  
  if (texts.length === 0) {
    console.log(`[xAI] No ${category} texts available, returning default message`);
    return { summary: `No ${category.toLowerCase()} data available for this date.`, cached: false };
  }

  const combinedText = texts.slice(0, 50).join("\n---\n");
  console.log(`[xAI] Combined text length: ${combinedText.length} chars (from ${Math.min(texts.length, 50)} texts)`);
  
  const payload = {
    type: "synthesize",
    category,
    texts: combinedText,
  };
  const cacheKey = xaiCache.hashPayload(payload);
  
  const cached = xaiCache.get(cacheKey);
  if (cached) {
    console.log(`[xAI] Using cached ${category} summary`);
    return { summary: cached, cached: true };
  }
  
  try {
    console.log(`[xAI] Calling Grok-3 API for ${category} summary...`);
    const startTime = Date.now();
    
    const response = await client.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are an expert avalanche forecaster assistant. Synthesize the following ${category} observations into a brief, actionable summary. Focus on the most important patterns and safety-relevant findings. Be concise - limit to 3-4 sentences maximum.`
        },
        {
          role: "user",
          content: `Briefly summarize key themes from these ${category} observations (3-4 sentences max):\n\n${combinedText}`
        }
      ],
      max_tokens: 200,
    });

    const elapsed = Date.now() - startTime;
    const summary = response.choices[0].message.content || `Unable to synthesize ${category.toLowerCase()} summary.`;
    
    console.log(`[xAI] ${category} summary generated in ${elapsed}ms (${summary.length} chars)`);
    
    xaiCache.set(cacheKey, summary);
    
    return { summary, cached: false };
  } catch (error) {
    console.error(`[xAI] Error synthesizing ${category}:`, error);
    return { summary: `Error generating ${category.toLowerCase()} summary. Please try again.`, cached: false };
  }
}

export async function chatWithContext(
  client: OpenAI,
  message: string, 
  context?: AggregatedData, 
  summaries?: SynthesizedSummaries
): Promise<string> {
  const contextJson = JSON.stringify({ aggregatedData: context, summaries }, null, 2);
  
  try {
    const response = await client.chat.completions.create({
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
