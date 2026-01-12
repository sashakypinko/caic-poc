import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOpenAIClient, synthesizeSummary, chatWithContext } from './xai';
import { xaiCache } from './cache';
import type OpenAI from 'openai';

describe('createOpenAIClient', () => {
  it('creates client with xAI base URL', () => {
    const client = createOpenAIClient('test-key');
    expect(client).toBeDefined();
  });
});

describe('synthesizeSummary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    xaiCache.clear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns default message for empty texts', async () => {
    const mockClient = {} as OpenAI;
    const result = await synthesizeSummary(mockClient, [], 'Observation');
    
    expect(result.summary).toBe('No observation data available for this date.');
    expect(result.cached).toBe(false);
  });

  it('returns cached response when available', async () => {
    const mockClient = {} as OpenAI;
    const texts = ['Test observation'];
    
    const payload = { type: 'synthesize', category: 'Observation', texts: 'Test observation' };
    const cacheKey = xaiCache.hashPayload(payload);
    xaiCache.set(cacheKey, 'Cached summary');
    
    const result = await synthesizeSummary(mockClient, texts, 'Observation');
    
    expect(result.summary).toBe('Cached summary');
    expect(result.cached).toBe(true);
  });

  it('calls API and caches response on cache miss', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Generated summary' } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await synthesizeSummary(mockClient, ['Test text'], 'Weather');
    
    expect(result.summary).toBe('Generated summary');
    expect(result.cached).toBe(false);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await synthesizeSummary(mockClient, ['Test text'], 'Snowpack');
    
    expect(result.summary).toContain('Error generating snowpack summary');
    expect(result.cached).toBe(false);
  });

  it('handles null message content', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await synthesizeSummary(mockClient, ['Test text'], 'Observation');
    
    expect(result.summary).toContain('Unable to synthesize');
  });

  it('limits texts to 50 entries', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Summary' } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const manyTexts = Array(100).fill('Text entry');
    await synthesizeSummary(mockClient, manyTexts, 'Observation');
    
    const call = mockCreate.mock.calls[0][0];
    const userMessage = call.messages.find((m: any) => m.role === 'user');
    const textCount = (userMessage.content.match(/Text entry/g) || []).length;
    expect(textCount).toBe(50);
  });
});

describe('chatWithContext', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns API response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Chat response' } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await chatWithContext(mockClient, 'What is the danger?');
    
    expect(result).toBe('Chat response');
  });

  it('includes context in system message', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Response' } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const context = { totalReports: 5 } as any;
    await chatWithContext(mockClient, 'Question', context);
    
    const call = mockCreate.mock.calls[0][0];
    const systemMessage = call.messages.find((m: any) => m.role === 'system');
    expect(systemMessage.content).toContain('totalReports');
  });

  it('handles API error gracefully', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await chatWithContext(mockClient, 'Question');
    
    expect(result).toBe('Error processing your question. Please try again.');
  });

  it('handles null message content', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await chatWithContext(mockClient, 'Question');
    
    expect(result).toContain("couldn't generate a response");
  });

  it('works without context or summaries', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Answer' } }],
    });
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;
    
    const result = await chatWithContext(mockClient, 'Simple question');
    
    expect(result).toBe('Answer');
    expect(mockCreate).toHaveBeenCalled();
  });
});
