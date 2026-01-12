import { describe, it, expect } from 'vitest';
import { MemStorage, storage } from './storage';

describe('server/storage re-exports', () => {
  it('exports MemStorage class', () => {
    expect(MemStorage).toBeDefined();
    const instance = new MemStorage();
    expect(instance).toBeInstanceOf(MemStorage);
  });

  it('exports storage singleton', () => {
    expect(storage).toBeDefined();
    expect(storage).toBeInstanceOf(MemStorage);
  });
});
