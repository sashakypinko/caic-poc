import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes';

vi.mock('./lib/caic', () => ({
  fetchCAICReports: vi.fn(),
  isValidDateFormat: vi.fn(),
}));

vi.mock('./lib/xai', () => ({
  createOpenAIClient: vi.fn(() => ({})),
  synthesizeSummary: vi.fn(),
  chatWithContext: vi.fn(),
}));

vi.mock('./lib/processing', () => ({
  aggregateReports: vi.fn(),
  collectTexts: vi.fn(),
}));

vi.mock('./lib/progress', () => ({
  progressTracker: {
    addClient: vi.fn(),
    removeClient: vi.fn(),
    sendProgress: vi.fn(),
  },
}));

import { fetchCAICReports, isValidDateFormat } from './lib/caic';
import { synthesizeSummary, chatWithContext } from './lib/xai';
import { aggregateReports, collectTexts } from './lib/processing';
import { progressTracker } from './lib/progress';

describe('registerRoutes', () => {
  let app: express.Express;
  let httpServer: ReturnType<typeof createServer>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    app = express();
    app.use(express.json());
    httpServer = createServer(app);
    await registerRoutes(httpServer, app);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    httpServer.close();
  });

  describe('GET /api/progress/:sessionId', () => {
    it('sets SSE headers and adds client', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      };
      const mockReq = {
        params: { sessionId: 'test-session' },
        on: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/progress/:sessionId'
      )?.route?.stack[0]?.handle;

      if (handler) {
        handler(mockReq, mockRes, () => {});
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
        expect(progressTracker.addClient).toHaveBeenCalledWith('test-session', mockRes);
      }
    });

    it('removes client on connection close', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
      };
      let closeCallback: Function | null = null;
      const mockReq = {
        params: { sessionId: 'close-test-session' },
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'close') {
            closeCallback = callback;
          }
        }),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/progress/:sessionId'
      )?.route?.stack[0]?.handle;

      if (handler) {
        handler(mockReq, mockRes, () => {});
        expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
        
        if (closeCallback) {
          closeCallback();
          expect(progressTracker.removeClient).toHaveBeenCalledWith('close-test-session');
        }
      }
    });
  });

  describe('POST /api/reports', () => {
    it('returns 400 for invalid request body', async () => {
      const mockReq = { body: {} };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid request' }));
      }
    });

    it('returns 400 for invalid date format', async () => {
      vi.mocked(isValidDateFormat).mockReturnValue(false);
      
      const mockReq = { body: { date: 'invalid-date' }, headers: {} };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    });

    it('returns aggregated data on success', async () => {
      vi.mocked(isValidDateFormat).mockReturnValue(true);
      vi.mocked(fetchCAICReports).mockResolvedValue([]);
      vi.mocked(aggregateReports).mockReturnValue({
        totalReports: 0,
        reportsWithAvalanches: 0,
        totalAvalanches: 0,
        avalanchesByElevation: { aboveTreeline: 0, nearTreeline: 0, belowTreeline: 0 },
        avalanchesByAspect: { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 },
        crackingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
        collapsingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
      });
      vi.mocked(collectTexts).mockReturnValue({ observations: [], snowpack: [], weather: [] });
      vi.mocked(synthesizeSummary).mockResolvedValue({ summary: 'Test summary', cached: false });

      const mockReq = { body: { date: '2025-01-12' }, headers: {} };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ date: '2025-01-12' }));
      }
    });

    it('sends progress updates with sessionId', async () => {
      vi.mocked(isValidDateFormat).mockReturnValue(true);
      vi.mocked(fetchCAICReports).mockResolvedValue([]);
      vi.mocked(aggregateReports).mockReturnValue({
        totalReports: 0,
        reportsWithAvalanches: 0,
        totalAvalanches: 0,
        avalanchesByElevation: { aboveTreeline: 0, nearTreeline: 0, belowTreeline: 0 },
        avalanchesByAspect: { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 },
        crackingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
        collapsingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
      });
      vi.mocked(collectTexts).mockReturnValue({ observations: [], snowpack: [], weather: [] });
      vi.mocked(synthesizeSummary).mockResolvedValue({ summary: 'Test', cached: false });

      const mockReq = { body: { date: '2025-01-12' }, headers: { 'x-session-id': 'session-123' } };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(progressTracker.sendProgress).toHaveBeenCalled();
      }
    });

    it('returns 500 on fetch error', async () => {
      vi.mocked(isValidDateFormat).mockReturnValue(true);
      vi.mocked(fetchCAICReports).mockRejectedValue(new Error('Network error'));

      const mockReq = { body: { date: '2025-01-12' }, headers: {} };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch and process reports' });
      }
    });

    it('shows cached status in progress updates', async () => {
      vi.mocked(isValidDateFormat).mockReturnValue(true);
      vi.mocked(fetchCAICReports).mockResolvedValue([]);
      vi.mocked(aggregateReports).mockReturnValue({
        totalReports: 0,
        reportsWithAvalanches: 0,
        totalAvalanches: 0,
        avalanchesByElevation: { aboveTreeline: 0, nearTreeline: 0, belowTreeline: 0 },
        avalanchesByAspect: { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 },
        crackingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
        collapsingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
      });
      vi.mocked(collectTexts).mockReturnValue({ observations: [], snowpack: [], weather: [] });
      vi.mocked(synthesizeSummary).mockResolvedValue({ summary: 'Cached', cached: true });

      const mockReq = { body: { date: '2025-01-12' }, headers: { 'x-session-id': 'session-123' } };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/reports' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(progressTracker.sendProgress).toHaveBeenCalledWith(
          'session-123',
          'synthesizing',
          60,
          'Observation summary loaded from cache'
        );
      }
    });
  });

  describe('POST /api/chat', () => {
    it('returns 400 for invalid request body', async () => {
      const mockReq = { body: {} };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/chat' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid request' }));
      }
    });

    it('returns chat response on success', async () => {
      vi.mocked(chatWithContext).mockResolvedValue('AI response');

      const mockReq = { body: { message: 'What is the danger?' } };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/chat' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.json).toHaveBeenCalledWith({ response: 'AI response' });
      }
    });

    it('passes context and summaries to chatWithContext', async () => {
      vi.mocked(chatWithContext).mockResolvedValue('Response with context');

      const mockContext = { 
        totalReports: 5,
        reportsWithAvalanches: 2,
        totalAvalanches: 3,
        avalanchesByElevation: { aboveTreeline: 1, nearTreeline: 1, belowTreeline: 1 },
        avalanchesByAspect: { N: 1, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 },
        crackingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
        collapsingCounts: { None: 0, Minor: 0, Moderate: 0, Major: 0, Severe: 0 },
      };
      const mockSummaries = { observationSummary: 'Obs', snowpackSummary: 'Snow', weatherSummary: 'Weather' };
      
      const mockReq = { 
        body: { 
          message: 'Question', 
          context: mockContext, 
          summaries: mockSummaries 
        } 
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/chat' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(chatWithContext).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ response: 'Response with context' });
      }
    });

    it('returns 500 on chat error', async () => {
      vi.mocked(chatWithContext).mockRejectedValue(new Error('Chat error'));

      const mockReq = { body: { message: 'Question' } };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/chat' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to process chat message' });
      }
    });

    it('truncates long messages in logs', async () => {
      vi.mocked(chatWithContext).mockResolvedValue('Response');

      const longMessage = 'x'.repeat(150);
      const mockReq = { body: { message: longMessage } };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const handler = (app as any)._router.stack.find(
        (layer: any) => layer.route?.path === '/api/chat' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes, () => {});
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('...'));
      }
    });
  });
});
