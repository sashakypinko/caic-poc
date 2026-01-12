import { describe, it, expect } from 'vitest';
import { serveStatic, getDistPath, validateDistPath } from './static';

describe('server/static re-exports', () => {
  it('exports serveStatic function', () => {
    expect(serveStatic).toBeDefined();
    expect(typeof serveStatic).toBe('function');
  });

  it('exports getDistPath function', () => {
    expect(getDistPath).toBeDefined();
    expect(typeof getDistPath).toBe('function');
  });

  it('exports validateDistPath function', () => {
    expect(validateDistPath).toBeDefined();
    expect(typeof validateDistPath).toBe('function');
  });
});
