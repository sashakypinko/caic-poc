import { createHash } from "node:crypto";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry {
  response: string;
  timestamp: number;
}

export class ResponseCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  hashPayload(payload: object): string {
    const json = JSON.stringify(payload);
    return createHash("sha256").update(json).digest("hex");
  }

  get(hash: string): string | null {
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.response;
    }
    if (cached) {
      this.cache.delete(hash);
    }
    return null;
  }

  set(hash: string, response: string): void {
    this.cache.set(hash, { response, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const xaiCache = new ResponseCache();
