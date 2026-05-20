import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseJsonBody } from './parse';
import type { NextRequest } from 'next/server';

function makeRequest(body: string | object): NextRequest {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    json: async () => {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw e;
      }
    },
  } as unknown as NextRequest;
}

const schema = z.object({ name: z.string().min(1) }).strict();

describe('parseJsonBody', () => {
  it('returns ok=true with parsed data on valid input', async () => {
    const req = makeRequest({ name: 'taro' });
    const result = await parseJsonBody(req, schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ name: 'taro' });
  });

  it('returns 400 on malformed JSON', async () => {
    const req = makeRequest('not-json');
    const result = await parseJsonBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe('Invalid JSON body');
    }
  });

  it('returns 400 with issues on schema mismatch', async () => {
    const req = makeRequest({ name: '' });
    const result = await parseJsonBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });

  it('rejects extra keys when schema is strict', async () => {
    const req = makeRequest({ name: 'taro', extra: 1 });
    const result = await parseJsonBody(req, schema);
    expect(result.ok).toBe(false);
  });
});
