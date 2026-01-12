import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDistPath, validateDistPath, serveStatic } from './static';
import path from 'path';
import fs from 'fs';
import type { Express, Response } from 'express';

vi.mock('fs');

describe('getDistPath', () => {
  it('resolves public directory from given dirname', () => {
    const result = getDistPath('/app/server');
    expect(result).toBe(path.resolve('/app/server', 'public'));
  });

  it('handles relative paths', () => {
    const result = getDistPath('./server');
    expect(result).toContain('public');
  });

  it('handles empty dirname', () => {
    const result = getDistPath('');
    expect(result).toContain('public');
  });
});

describe('validateDistPath', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not throw when directory exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(() => validateDistPath('/app/dist')).not.toThrow();
  });

  it('throws error when directory does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => validateDistPath('/app/missing')).toThrow(
      'Could not find the build directory: /app/missing, make sure to build the client first'
    );
  });

  it('includes path in error message', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const testPath = '/custom/path/to/dist';
    expect(() => validateDistPath(testPath)).toThrow(testPath);
  });
});

describe('serveStatic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('configures express static middleware when dist exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockUse = vi.fn();
    const mockApp = { use: mockUse } as unknown as Express;
    
    serveStatic(mockApp, '/app/server');
    
    expect(mockUse).toHaveBeenCalledTimes(2);
  });

  it('throws when dist directory does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    const mockApp = { use: vi.fn() } as unknown as Express;
    
    expect(() => serveStatic(mockApp, '/app/server')).toThrow(
      'Could not find the build directory'
    );
  });

  it('registers catch-all route for SPA fallback', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const handlers: Array<{ path: string; handler: Function }> = [];
    const mockUse = vi.fn((pathOrHandler: any, handler?: any) => {
      if (typeof pathOrHandler === 'string') {
        handlers.push({ path: pathOrHandler, handler });
      }
    });
    const mockApp = { use: mockUse } as unknown as Express;
    
    serveStatic(mockApp, '/app/server');
    
    const catchAllRoute = handlers.find(h => h.path === '*');
    expect(catchAllRoute).toBeDefined();
    
    const mockRes = { sendFile: vi.fn() } as unknown as Response;
    catchAllRoute?.handler({}, mockRes);
    expect(mockRes.sendFile).toHaveBeenCalledWith(
      expect.stringContaining('index.html')
    );
  });
});
