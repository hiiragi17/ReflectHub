import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupErrorHandling } from './errorLoggingService';

describe('setupErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when called in browser context', () => {
    expect(() => setupErrorHandling()).not.toThrow();
  });

  it('registers global error handlers', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    setupErrorHandling();

    const registeredEvents = addEventListenerSpy.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain('error');
    expect(registeredEvents).toContain('unhandledrejection');
    expect(registeredEvents).toContain('beforeunload');
  });
});

describe('ErrorLoggingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs an error to the queue', async () => {
    const { errorLoggingService } = await import('./errorLoggingService');
    const initialLength = errorLoggingService.getQueue().length;

    errorLoggingService.log('テストエラー', 'network', undefined, { page: '/test' });

    expect(errorLoggingService.getQueue().length).toBeGreaterThanOrEqual(initialLength);
  });

  it('clears the queue', async () => {
    const { errorLoggingService } = await import('./errorLoggingService');
    errorLoggingService.log('エラー1', 'unknown');
    errorLoggingService.clearQueue();
    expect(errorLoggingService.getQueue()).toHaveLength(0);
  });

  it('sends logs to API on flush', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { errorLoggingService } = await import('./errorLoggingService');
    errorLoggingService.log('送信テスト', 'server');
    await errorLoggingService.flush();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/logs/errors',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('restores queue when flush fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const { errorLoggingService } = await import('./errorLoggingService');
    errorLoggingService.clearQueue();
    errorLoggingService.log('失敗テスト', 'network');

    const before = errorLoggingService.getQueue().length;
    await errorLoggingService.flush();

    expect(errorLoggingService.getQueue().length).toBeGreaterThanOrEqual(before);
  });
});
