import { z } from "zod";

// CAIC API Response Types
export const avalancheObservationSchema = z.object({
  id: z.number().optional(),
  aspect: z.string().nullable().optional(),
  elevation: z.string().nullable().optional(),
  type_code: z.string().nullable().optional(),
  trigger_code: z.string().nullable().optional(),
  size_relative: z.string().nullable().optional(),
  size_destructive: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
});

export const snowpackObservationSchema = z.object({
  id: z.number().optional(),
  cracking: z.string().nullable().optional(),
  collapsing: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
});

export const weatherObservationSchema = z.object({
  id: z.number().optional(),
  sky_cover: z.string().nullable().optional(),
  precipitation_type: z.string().nullable().optional(),
  precipitation_rate: z.string().nullable().optional(),
  air_temperature: z.number().nullable().optional(),
  wind_direction: z.string().nullable().optional(),
  wind_speed: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
});

export const snowpackDetailSchema = z.object({
  description: z.string().nullable().optional(),
});

export const weatherDetailSchema = z.object({
  description: z.string().nullable().optional(),
});

export const fieldReportSchema = z.object({
  id: z.number(),
  type: z.string().nullable().optional(),
  backcountry_zone: z.string().nullable().optional(),
  observed_at: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  observation_summary: z.string().nullable().optional(),
  avalanche_observations_count: z.number().default(0),
  avalanche_observations: z.array(avalancheObservationSchema).default([]),
  snowpack_observations: z.array(snowpackObservationSchema).default([]),
  weather_observations: z.array(weatherObservationSchema).default([]),
  snowpack_detail: snowpackDetailSchema.nullable().optional(),
  weather_detail: weatherDetailSchema.nullable().optional(),
});

export type AvalancheObservation = z.infer<typeof avalancheObservationSchema>;
export type SnowpackObservation = z.infer<typeof snowpackObservationSchema>;
export type WeatherObservation = z.infer<typeof weatherObservationSchema>;
export type FieldReport = z.infer<typeof fieldReportSchema>;

// Aggregation Types
export const elevationBandSchema = z.object({
  aboveTreeline: z.number().default(0),
  nearTreeline: z.number().default(0),
  belowTreeline: z.number().default(0),
});

export const aspectCountsSchema = z.object({
  N: z.number().default(0),
  NE: z.number().default(0),
  E: z.number().default(0),
  SE: z.number().default(0),
  S: z.number().default(0),
  SW: z.number().default(0),
  W: z.number().default(0),
  NW: z.number().default(0),
});

export const instabilityCountsSchema = z.object({
  None: z.number().default(0),
  Minor: z.number().default(0),
  Moderate: z.number().default(0),
  Major: z.number().default(0),
  Severe: z.number().default(0),
});

export const aggregatedDataSchema = z.object({
  totalReports: z.number(),
  reportsWithAvalanches: z.number(),
  totalAvalanches: z.number(),
  avalanchesByElevation: elevationBandSchema,
  avalanchesByAspect: aspectCountsSchema,
  crackingCounts: instabilityCountsSchema,
  collapsingCounts: instabilityCountsSchema,
});

export type ElevationBand = z.infer<typeof elevationBandSchema>;
export type AspectCounts = z.infer<typeof aspectCountsSchema>;
export type InstabilityCounts = z.infer<typeof instabilityCountsSchema>;
export type AggregatedData = z.infer<typeof aggregatedDataSchema>;

// Synthesized Summaries
export const synthesizedSummariesSchema = z.object({
  observationSummary: z.string(),
  snowpackSummary: z.string(),
  weatherSummary: z.string(),
});

export type SynthesizedSummaries = z.infer<typeof synthesizedSummariesSchema>;

// Full Report Response
export const reportResponseSchema = z.object({
  date: z.string(),
  aggregatedData: aggregatedDataSchema,
  summaries: synthesizedSummariesSchema,
  rawReports: z.array(fieldReportSchema).optional(),
});

export type ReportResponse = z.infer<typeof reportResponseSchema>;

// Chat Types
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string(),
  context: aggregatedDataSchema.optional(),
  summaries: synthesizedSummariesSchema.optional(),
});

export const chatResponseSchema = z.object({
  response: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

// API Request Types
export const fetchReportsRequestSchema = z.object({
  date: z.string(),
});

export type FetchReportsRequest = z.infer<typeof fetchReportsRequestSchema>;
