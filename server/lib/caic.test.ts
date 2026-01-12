import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCAICUrl, fetchCAICReports, isValidDateFormat } from './caic';

describe('buildCAICUrl', () => {
  it('builds URL with correct date range', () => {
    const url = buildCAICUrl('2025-01-12');
    expect(url).toContain('observed_at_gteq');
    expect(url).toContain('observed_at_lteq');
    expect(url).toContain('2025-01-12T00%3A00%3A01.000Z');
    expect(url).toContain('2025-01-12T23%3A59%3A59.000Z');
  });

  it('encodes date parameters correctly', () => {
    const url = buildCAICUrl('2025-01-12');
    expect(url).toContain('%3A');
  });

  it('uses correct API endpoint', () => {
    const url = buildCAICUrl('2025-01-12');
    expect(url).toContain('api.avalanche.state.co.us');
    expect(url).toContain('/api/v2/observation_reports');
  });
});

describe('fetchCAICReports', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns parsed JSON data on success', async () => {
    const mockData = [{ id: 1 }, { id: 2 }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
      status: 200,
      statusText: 'OK',
    });

    const result = await fetchCAICReports('2025-01-12', mockFetch);
    expect(result).toEqual(mockData);
  });

  it('throws error on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchCAICReports('2025-01-12', mockFetch)).rejects.toThrow('CAIC API error: 500');
  });

  it('throws error on 404 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchCAICReports('2025-01-12', mockFetch)).rejects.toThrow('CAIC API error: 404');
  });

  it('logs fetch timing information', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchCAICReports('2025-01-12', mockFetch);
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CAIC] Fetching reports'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CAIC] Retrieved'));
  });

  it('calls fetch with correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchCAICReports('2025-01-12', mockFetch);
    
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('2025-01-12'));
  });
});

describe('isValidDateFormat', () => {
  it('returns true for valid YYYY-MM-DD format', () => {
    expect(isValidDateFormat('2025-01-12')).toBe(true);
    expect(isValidDateFormat('2024-12-31')).toBe(true);
    expect(isValidDateFormat('2000-01-01')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(isValidDateFormat('01-12-2025')).toBe(false);
    expect(isValidDateFormat('2025/01/12')).toBe(false);
    expect(isValidDateFormat('2025-1-12')).toBe(false);
    expect(isValidDateFormat('2025-01-1')).toBe(false);
    expect(isValidDateFormat('not-a-date')).toBe(false);
    expect(isValidDateFormat('')).toBe(false);
  });

  it('returns false for partial matches', () => {
    expect(isValidDateFormat('2025-01-12 extra')).toBe(false);
    expect(isValidDateFormat('prefix 2025-01-12')).toBe(false);
  });
});
