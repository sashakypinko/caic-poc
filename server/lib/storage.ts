export interface IStorage {
  // No persistent storage needed for this POC
  // Data is fetched fresh from CAIC API each request
}

export class MemStorage implements IStorage {
  constructor() {
    // No initialization needed
  }
}

export const storage = new MemStorage();
