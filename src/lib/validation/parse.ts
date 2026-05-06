import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';

/**
 * リクエスト JSON ボディを zod スキーマで検証する共通ヘルパー。
 *
 * - JSON パース失敗時は 400 `Invalid JSON body`
 * - スキーマ不一致時は 400 とフィールドごとのエラーを返す
 *
 * 成功時は `{ ok: true, data }`、失敗時は `{ ok: false, response }` を返し、
 * 呼び出し側ではそのまま `return response` できる。
 */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return {
      ok: false,
      response: NextResponse.json(
        { error: issues[0]?.message ?? 'Validation failed', issues },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}
