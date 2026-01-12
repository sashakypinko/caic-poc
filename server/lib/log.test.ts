import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, formatLogTime } from './log';

describe('log', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs message with default source', () => {
    log('test message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[express]');
    expect(loggedMessage).toContain('test message');
  });

  it('logs message with custom source', () => {
    log('custom message', 'api');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[api]');
    expect(loggedMessage).toContain('custom message');
  });

  it('includes formatted time in log', () => {
    log('time test');
    const loggedMessage = consoleSpy.mock.calls[0][0];
    expect(loggedMessage).toMatch(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
  });
});

describe('formatLogTime', () => {
  it('returns formatted time string', () => {
    const time = formatLogTime();
    expect(time).toMatch(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
  });

  it('returns consistent format', () => {
    const time1 = formatLogTime();
    const time2 = formatLogTime();
    expect(time1.length).toBe(time2.length);
  });
});
