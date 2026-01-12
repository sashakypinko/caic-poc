// In-memory storage for CAIC Field Report Aggregator
// This app doesn't require persistent storage as it fetches fresh data from the CAIC API

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
