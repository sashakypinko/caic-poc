import { describe, it, expect } from 'vitest';
import { MemStorage, storage } from './storage';

describe('MemStorage', () => {
  it('can be instantiated', () => {
    const store = new MemStorage();
    expect(store).toBeInstanceOf(MemStorage);
  });

  it('exports a singleton storage instance', () => {
    expect(storage).toBeInstanceOf(MemStorage);
  });
});
