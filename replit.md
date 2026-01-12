# CAIC Field Report Aggregator

## Overview

This is a proof-of-concept web application for Colorado Avalanche Information Center (CAIC) forecasters and avalanche professionals. The application fetches daily field reports from the CAIC API, aggregates key metrics (avalanche counts, elevation bands, aspects, instability signs), and uses xAI's Grok LLM to synthesize natural language summaries from observation data. It includes an interactive chat interface for querying the aggregated data.

## Recent Changes

- **2026-01-12**: Initial MVP implementation complete
  - Frontend: Date picker, metrics dashboard, charts (aspect/elevation), instability tables, AI summaries, chat interface
  - Backend: CAIC API integration, data aggregation, xAI Grok-3 integration for summaries and chat
  - Added Zod schema validation for all API endpoints

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Charts**: Recharts for data visualization (aspect and elevation charts)
- **Design System**: Material Design-inspired with Roboto font, focused on data-intensive professional interfaces

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Validation**: Zod schemas for request body validation
- **External API Integration**: Fetches field reports from CAIC API (`api.avalanche.state.co.us`)
- **LLM Integration**: xAI Grok-3 API for natural language synthesis and chat functionality

### API Endpoints
- `POST /api/reports` - Fetches and aggregates CAIC field reports for a date
  - Request: `{ date: "YYYY-MM-DD" }`
  - Response: Aggregated data, AI summaries
- `POST /api/chat` - Chat about aggregated data with AI context
  - Request: `{ message: string, context?: AggregatedData, summaries?: SynthesizedSummaries }`
  - Response: `{ response: string }`

### Data Flow
1. User selects a date via the date picker
2. Frontend POSTs to `/api/reports` with the selected date
3. Backend validates request with Zod schema
4. Backend fetches all field reports for that date from CAIC API
5. Backend aggregates data (avalanche counts, elevation bands, aspects, instability signs)
6. Backend calls xAI Grok-3 to synthesize summaries from observation text
7. Frontend displays metrics, charts, and AI-generated summaries
8. Chat interface allows follow-up questions about the aggregated data

### Storage Approach
- **In-memory only**: No persistent database required for this POC
- Data is fetched fresh from CAIC API on each request

### Key Design Decisions
- **No database persistence**: Fresh API calls ensure up-to-date data; reduces complexity for POC
- **xAI Grok-3**: Used for LLM synthesis tasks (upgraded from deprecated grok-2-1212)
- **shadcn/ui components**: Provides accessible, customizable UI primitives with consistent styling
- **Separated aggregation logic**: Server handles all data processing to keep frontend lightweight
- **Zod validation**: All API endpoints validate request bodies with shared schema types

## External Dependencies

### Third-Party APIs
- **CAIC API**: `https://api.avalanche.state.co.us/api/v2/observation_reports` - Source for field report data with date range filtering
- **xAI Grok API**: `https://api.x.ai/v1` - LLM for synthesizing observation summaries and powering chat interface (requires `XAI_API_KEY` secret)

### Key NPM Packages
- `openai`: Client library configured for xAI API compatibility
- `@tanstack/react-query`: Async state management
- `recharts`: Charting library for data visualization
- `date-fns`: Date manipulation utilities
- `zod`: Schema validation for API requests/responses

## Environment Variables Required
- `XAI_API_KEY`: API key for xAI Grok service