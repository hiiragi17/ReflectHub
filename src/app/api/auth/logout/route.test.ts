import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { signOut, getUser } = vi.hoisted(() => ({ signOut: vi.fn(), getUser: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: 'sb-abc-auth-token', value: 'x' }],
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { signOut, getUser } }),
}));

import { POST } from './route';

function req(body?: string) {
  return new NextRequest('http://localhost/api/auth/logout', {
    method: 'POST',
    body,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('ボディなしならこの端末のみ (local) でログアウトする', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('scope: global を指定すると全端末を失効させる', async () => {
    const res = await POST(req(JSON.stringify({ scope: 'global' })));
    expect(res.status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('global は、有効なセッションがなければ失効を実行せず 401 を返す', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });
    const res = await POST(req(JSON.stringify({ scope: 'global' })));
    expect(res.status).toBe(401);
    expect(signOut).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('local はセッションがなくても (getUser を呼ばず) 従来どおりログアウトできる', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });
    const res = await POST(req(JSON.stringify({ scope: 'local' })));
    expect(res.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('認証 Cookie を削除する', async () => {
    const res = await POST(req(JSON.stringify({ scope: 'local' })));
    expect(res.headers.get('set-cookie')).toContain('sb-abc-auth-token=');
  });

  it('global の失効に失敗したら 500 を返し、Cookie は消さない', async () => {
    signOut.mockResolvedValue({ error: new Error('boom') });
    const res = await POST(req(JSON.stringify({ scope: 'global' })));
    expect(res.status).toBe(500);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('local の失敗は従来どおりログアウトを続行する', async () => {
    signOut.mockResolvedValue({ error: new Error('boom') });
    const res = await POST(req(JSON.stringify({ scope: 'local' })));
    expect(res.status).toBe(200);
  });

  it('不正な scope・JSON は 400', async () => {
    expect((await POST(req(JSON.stringify({ scope: 'all' })))).status).toBe(400);
    expect((await POST(req('{oops'))).status).toBe(400);
    expect(signOut).not.toHaveBeenCalled();
  });
});
