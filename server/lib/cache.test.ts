import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResponseCache } from './cache';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache(1000); // 1 second TTL for testing
  });

  describe('hashPayload', () => {
    it('returns consistent hash for same payload', () => {
      const payload = { type: 'test', data: 'hello' };
      const hash1 = cache.hashPayload(payload);
      const hash2 = cache.hashPayload(payload);
      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different payloads', () => {
      const hash1 = cache.hashPayload({ type: 'test', data: 'hello' });
      const hash2 = cache.hashPayload({ type: 'test', data: 'world' });
      expect(hash1).not.toBe(hash2);
    });

    it('returns 64-character hex string (SHA-256)', () => {
      const hash = cache.hashPayload({ test: true });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles empty object', () => {
      const hash = cache.hashPayload({});
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles nested objects', () => {
      const hash = cache.hashPayload({ nested: { deep: { value: 123 } } });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles arrays in payload', () => {
      const hash = cache.hashPayload({ items: [1, 2, 3] });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('set and get', () => {
    it('stores and retrieves a response', () => {
      cache.set('hash123', 'cached response');
      expect(cache.get('hash123')).toBe('cached response');
    });

    it('returns null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('overwrites existing entry', () => {
      cache.set('hash123', 'first');
      cache.set('hash123', 'second');
      expect(cache.get('hash123')).toBe('second');
    });

    it('handles empty string response', () => {
      cache.set('hash123', '');
      expect(cache.get('hash123')).toBe('');
    });

    it('handles long response strings', () => {
      const longString = 'x'.repeat(10000);
      cache.set('hash123', longString);
      expect(cache.get('hash123')).toBe(longString);
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns cached value before TTL expires', () => {
      cache.set('hash123', 'cached');
      vi.advanceTimersByTime(500); // Half of 1s TTL
      expect(cache.get('hash123')).toBe('cached');
    });

    it('returns null and deletes entry after TTL expires', () => {
      cache.set('hash123', 'cached');
      vi.advanceTimersByTime(1001); // Just past 1s TTL
      expect(cache.get('hash123')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('uses custom TTL from constructor', () => {
      const shortCache = new ResponseCache(100);
      shortCache.set('hash', 'value');
      vi.advanceTimersByTime(50);
      expect(shortCache.get('hash')).toBe('value');
      vi.advanceTimersByTime(51);
      expect(shortCache.get('hash')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('hash1', 'value1');
      cache.set('hash2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('hash1')).toBeNull();
      expect(cache.get('hash2')).toBeNull();
    });
  });

  describe('size', () => {
    it('returns 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('returns correct count after adding entries', () => {
      cache.set('hash1', 'value1');
      cache.set('hash2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('decrements when entry is retrieved after expiration', () => {
      vi.useFakeTimers();
      cache.set('hash1', 'value1');
      cache.set('hash2', 'value2');
      expect(cache.size()).toBe(2);
      
      vi.advanceTimersByTime(1001);
      cache.get('hash1'); // This triggers deletion
      expect(cache.size()).toBe(1);
      vi.useRealTimers();
    });
  });
});
