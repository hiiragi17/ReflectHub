import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorType,
  createAppError,
  getErrorMessage,
  handleFetchError,
  retryOperation,
  retryWithNetworkRecovery,
  waitForOnline,
} from './errorHandler';

describe('getErrorMessage', () => {
  it('returns Japanese message for NETWORK error', () => {
    const error = { type: ErrorType.NETWORK, message: '', timestamp: 0 };
    expect(getErrorMessage(error)).toContain('ネットワーク');
  });

  it('returns Japanese message for OFFLINE error', () => {
    const error = { type: ErrorType.OFFLINE, message: '', timestamp: 0 };
    expect(getErrorMessage(error)).toContain('オフライン');
  });

  it('returns Japanese message for SERVER error', () => {
    const error = { type: ErrorType.SERVER, message: '', timestamp: 0 };
    expect(getErrorMessage(error)).toContain('サーバーエラー');
  });

  it('returns Japanese message for AUTHENTICATION error', () => {
    const error = { type: ErrorType.AUTHENTICATION, message: '', timestamp: 0 };
    expect(getErrorMessage(error)).toContain('ログイン');
  });

  it('returns Japanese message for VALIDATION error', () => {
    const error = { type: ErrorType.VALIDATION, message: '', timestamp: 0 };
    expect(getErrorMessage(error)).toContain('入力');
  });

  it('returns custom message for UNKNOWN error when message is set', () => {
    const error = { type: ErrorType.UNKNOWN, message: 'カスタムエラー', timestamp: 0 };
    expect(getErrorMessage(error)).toBe('カスタムエラー');
  });
});

describe('createAppError', () => {
  it('classifies 401 as AUTHENTICATION', () => {
    const err = createAppError(new Error('Unauthorized'), 401);
    expect(err.type).toBe(ErrorType.AUTHENTICATION);
    expect(err.statusCode).toBe(401);
  });

  it('classifies 403 as AUTHORIZATION', () => {
    const err = createAppError(new Error('Forbidden'), 403);
    expect(err.type).toBe(ErrorType.AUTHORIZATION);
  });

  it('classifies 404 as NOT_FOUND', () => {
    const err = createAppError(new Error('Not Found'), 404);
    expect(err.type).toBe(ErrorType.NOT_FOUND);
  });

  it('classifies 500 as SERVER', () => {
    const err = createAppError(new Error('Server Error'), 500);
    expect(err.type).toBe(ErrorType.SERVER);
  });

  it('classifies network error message as NETWORK', () => {
    const err = createAppError(new Error('fetch failed'));
    expect(err.type).toBe(ErrorType.NETWORK);
  });

  it('uses customMessage when provided', () => {
    const err = createAppError(new Error('original'), undefined, 'カスタムメッセージ');
    expect(err.message).toBe('カスタムメッセージ');
  });

  it('includes timestamp', () => {
    const before = Date.now();
    const err = createAppError(new Error('test'));
    expect(err.timestamp).toBeGreaterThanOrEqual(before);
  });
});

describe('handleFetchError', () => {
  it('extracts message from JSON response', async () => {
    const response = new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
    });
    const err = await handleFetchError(response);
    expect(err.message).toBe('Bad request');
    expect(err.statusCode).toBe(400);
  });

  it('uses customMessage when provided', async () => {
    const response = new Response(JSON.stringify({}), { status: 500 });
    const err = await handleFetchError(response, '上書きメッセージ');
    expect(err.message).toBe('上書きメッセージ');
  });
});

describe('retryOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('succeeds on first attempt', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await retryOperation(op, 3, 100);
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on second attempt', async () => {
    let calls = 0;
    const op = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('success');
    });

    const promise = retryOperation(op, 3, 1000);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const op = vi.fn().mockRejectedValue(new Error('always fails'));

    const promise = retryOperation(op, 3, 1000);
    // タイマー消化中に reject されるため、先にハンドラを付けて unhandled rejection を防ぐ
    const expectation = expect(promise).rejects.toThrow('always fails');
    await vi.runAllTimersAsync();

    await expectation;
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('uses exponential backoff delays (1s → 2s → 4s)', async () => {
    const delays: number[] = [];
    const op = vi.fn().mockRejectedValue(new Error('fail'));

    const originalSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: TimerHandler, delay?: number) => {
        if (typeof delay === 'number') delays.push(delay);
        return originalSetTimeout(fn as () => void, 0);
      });

    // タイマー消化中に reject されるため、先にハンドラを付けて unhandled rejection を防ぐ
    const promise = retryOperation(op, 3, 1000).catch(() => {
      // expected
    });
    await vi.runAllTimersAsync();
    await promise;

    setTimeoutSpy.mockRestore();

    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
  });
});

describe('waitForOnline', () => {
  it('resolves immediately when online', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    await expect(waitForOnline()).resolves.toBeUndefined();
  });

  it('resolves when online event fires', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const promise = waitForOnline();
    window.dispatchEvent(new Event('online'));

    await expect(promise).resolves.toBeUndefined();

    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });
});

describe('retryWithNetworkRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('succeeds immediately when online', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await retryWithNetworkRecovery(op, 3, 1000);
    expect(result).toBe('ok');
  });

  it('does not retry on non-recoverable errors', async () => {
    const op = vi.fn().mockRejectedValue(new Error('Validation failed'));
    const promise = retryWithNetworkRecovery(op, 3, 100);
    // タイマー消化中に reject されるため、先にハンドラを付けて unhandled rejection を防ぐ
    const expectation = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectation;
    expect(op).toHaveBeenCalledTimes(1);
  });
});
