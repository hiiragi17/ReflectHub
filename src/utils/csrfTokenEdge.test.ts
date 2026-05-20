import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateCSRFToken } from './csrfToken';
import { verifyCSRFAsync } from './csrfTokenEdge';

describe('csrfTokenEdge', () => {
  const ORIGINAL_SECRET = process.env.CSRF_SECRET;

  beforeAll(() => {
    process.env.CSRF_SECRET = 'test-secret-for-edge-1234567890abc';
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CSRF_SECRET;
    } else {
      process.env.CSRF_SECRET = ORIGINAL_SECRET;
    }
  });

  it('accepts a freshly generated token submitted in both header and cookie', async () => {
    const token = generateCSRFToken();
    expect(await verifyCSRFAsync(token, token)).toEqual({ ok: true });
  });

  it('reports missing_header when header is null', async () => {
    expect(await verifyCSRFAsync(null, 'x')).toEqual({ ok: false, reason: 'missing_header' });
  });

  it('reports missing_cookie when cookie is null', async () => {
    expect(await verifyCSRFAsync('x', null)).toEqual({ ok: false, reason: 'missing_cookie' });
  });

  it('reports mismatch when header and cookie differ', async () => {
    const a = generateCSRFToken();
    const b = generateCSRFToken();
    expect(await verifyCSRFAsync(a, b)).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('reports invalid_signature when signature is tampered', async () => {
    const token = generateCSRFToken();
    const [random] = token.split('.');
    const tampered = `${random}.deadbeef`;
    expect(await verifyCSRFAsync(tampered, tampered)).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });

  it('reports invalid_signature on malformed token', async () => {
    expect(await verifyCSRFAsync('no-dot', 'no-dot')).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });
});
