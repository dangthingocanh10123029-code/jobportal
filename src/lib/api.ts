import { createSupabaseServerClient } from './supabase-server';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body (camelCase, see docs/api-contract.md v3). */
  body?: unknown;
  /** Multipart body (file uploads); takes precedence over `body`. */
  formData?: FormData;
  /** Send the session's access token as Bearer (default true). */
  auth?: boolean;
};

/** Calls the FastAPI backend (`API_URL`). HTTP errors → `{ ok: false }` (5xx also logged); network errors throw. */
export async function apiFetch<T>(path: string, { method = 'GET', body, formData, auth = true }: ApiOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (auth) {
    // getSession reads the cookie without re-verifying: middleware already verified (and refreshed) it, and FastAPI checks the JWT.
    // A token already expired (refresh failed) is not sent: the request goes out as a guest instead of failing.
    const { session } = (await (await createSupabaseServerClient()).auth.getSession()).data;
    if (session && (session.expires_at ?? Infinity) * 1000 > Date.now()) headers.Authorization = `Bearer ${session.access_token}`;
  }
  // Checked after reading cookies, so `next build` treats the page as dynamic (on Vercel the API_URL binding only exists at runtime).
  const base = process.env.API_URL;
  if (!base) throw new Error('Thiếu biến môi trường API_URL');
  let payload: BodyInit | undefined;
  if (formData) {
    // Encode multipart once, boundary included: on Vercel a FormData body was re-serialized with a different boundary than its header.
    const encoded = new Response(formData);
    headers['Content-Type'] = encoded.headers.get('Content-Type')!;
    payload = await encoded.arrayBuffer();
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${base}${path}`, { method, headers, body: payload, cache: 'no-store' });
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: json as T };
  if (res.status >= 500) console.error('[api]', method, path, res.status);
  const error = (json as { error?: unknown } | null)?.error;
  return { ok: false, status: res.status, error: typeof error === 'string' ? error : `Lỗi máy chủ (${res.status})` };
}
