import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import { createSupabaseServerClient } from './supabase-server';
import { apiFetch } from './api';

vi.mock('./supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));

function withSession(accessToken: string | null) {
  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    fromPartial({
      auth: { getSession: async () => ({ data: { session: accessToken ? { access_token: accessToken } : null } }) },
    }),
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  withSession('tok');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

describe('apiFetch', () => {
  it('GET kèm Bearer từ session, trả data', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok' }));
    expect(await apiFetch('/health')).toEqual({ ok: true, data: { status: 'ok' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://api.test/health');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('body JSON → Content-Type json', async () => {
    fetchMock.mockResolvedValue(json({ id: 'p1' }, 201));
    await apiFetch('/me/postings', { method: 'POST', body: { title: 'Dev' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe('{"title":"Dev"}');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('formData gửi nguyên, không đặt Content-Type', async () => {
    fetchMock.mockResolvedValue(json({}));
    const formData = new FormData();
    await apiFetch('/applications', { method: 'POST', formData });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe(formData);
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('auth:false hoặc chưa đăng nhập → không có Authorization', async () => {
    fetchMock.mockResolvedValue(json([]));
    await apiFetch('/postings', { auth: false });
    withSession(null);
    await apiFetch('/postings');
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual([{}, {}]);
  });

  it('lỗi HTTP → { ok:false, status, error }', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Không có quyền' }, 403));
    expect(await apiFetch('/me/postings')).toEqual({ ok: false, status: 403, error: 'Không có quyền' });
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));
    expect(await apiFetch('/x')).toEqual({ ok: false, status: 500, error: 'Lỗi máy chủ (500)' });
  });

  it('5xx → console.error(method, path, status); 4xx không log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(json({ error: 'Không tìm thấy' }, 404));
    await apiFetch('/me/x');
    fetchMock.mockResolvedValue(new Response('oops', { status: 502 }));
    await apiFetch('/me/saved-postings', { method: 'POST' });
    expect(log.mock.calls).toEqual([['[api]', 'POST', '/me/saved-postings', 502]]);
    log.mockRestore();
  });

  it('lỗi mạng ném ra; thiếu API_URL ném ra', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(apiFetch('/health')).rejects.toThrow('fetch failed');
    vi.stubEnv('API_URL', '');
    await expect(apiFetch('/health')).rejects.toThrow(/API_URL/);
  });
});
