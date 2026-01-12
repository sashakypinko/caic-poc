import type { Response } from "express";

export type ProgressClient = {
  res: Response;
  sessionId: string;
};

export class ProgressTracker {
  private clients = new Map<string, ProgressClient>();

  addClient(sessionId: string, res: Response): void {
    this.clients.set(sessionId, { res, sessionId });
  }

  removeClient(sessionId: string): void {
    this.clients.delete(sessionId);
  }

  sendProgress(sessionId: string, stage: string, progress: number, message: string): void {
    const client = this.clients.get(sessionId);
    if (client) {
      client.res.write(`data: ${JSON.stringify({ stage, progress, message })}\n\n`);
    }
  }

  hasClient(sessionId: string): boolean {
    return this.clients.has(sessionId);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const progressTracker = new ProgressTracker();
