import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressTracker } from './progress';
import type { Response } from 'express';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  describe('addClient', () => {
    it('adds a client to the tracker', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      expect(tracker.hasClient('session-1')).toBe(true);
    });

    it('overwrites existing client with same sessionId', () => {
      const mockRes1 = { write: vi.fn() } as unknown as Response;
      const mockRes2 = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes1);
      tracker.addClient('session-1', mockRes2);
      expect(tracker.getClientCount()).toBe(1);
    });
  });

  describe('removeClient', () => {
    it('removes a client from the tracker', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      tracker.removeClient('session-1');
      expect(tracker.hasClient('session-1')).toBe(false);
    });

    it('does nothing when removing non-existent client', () => {
      expect(() => tracker.removeClient('non-existent')).not.toThrow();
    });
  });

  describe('sendProgress', () => {
    it('writes SSE data to client response', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      
      tracker.sendProgress('session-1', 'fetching', 50, 'Halfway done');
      
      expect(mockRes.write).toHaveBeenCalledWith(
        'data: {"stage":"fetching","progress":50,"message":"Halfway done"}\n\n'
      );
    });

    it('does nothing when client does not exist', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.sendProgress('non-existent', 'fetching', 50, 'Test');
      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it('sends progress with different stages', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      
      tracker.sendProgress('session-1', 'aggregating', 75, 'Processing data');
      
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('"stage":"aggregating"')
      );
    });
  });

  describe('hasClient', () => {
    it('returns true for existing client', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      expect(tracker.hasClient('session-1')).toBe(true);
    });

    it('returns false for non-existing client', () => {
      expect(tracker.hasClient('non-existent')).toBe(false);
    });
  });

  describe('getClientCount', () => {
    it('returns 0 for empty tracker', () => {
      expect(tracker.getClientCount()).toBe(0);
    });

    it('returns correct count after adding clients', () => {
      const mockRes1 = { write: vi.fn() } as unknown as Response;
      const mockRes2 = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes1);
      tracker.addClient('session-2', mockRes2);
      expect(tracker.getClientCount()).toBe(2);
    });

    it('decrements after removing client', () => {
      const mockRes = { write: vi.fn() } as unknown as Response;
      tracker.addClient('session-1', mockRes);
      tracker.removeClient('session-1');
      expect(tracker.getClientCount()).toBe(0);
    });
  });
});
