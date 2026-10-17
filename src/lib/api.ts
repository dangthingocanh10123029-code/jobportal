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

/** Calls the FastAPI backend (`API_URL`). HTTP errors → `{ ok: false }`; network errors throw. */
export async function apiFetch<T>(path: string, { method = 'GET', body, formData, auth = true }: ApiOptions = {}): Promise<ApiResult<T>> {
  const base = process.env.API_URL;
  if (!base) throw new Error('Thiếu biến môi trường API_URL');

  const headers: Record<string, string> = {};
  if (auth) {
    // getSession reads the cookie without re-verifying: middleware already verified it, and FastAPI checks the JWT.
    const { data } = await (await createSupabaseServerClient()).auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let payload: BodyInit | undefined = formData;
  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${base}${path}`, { method, headers, body: payload, cache: 'no-store' });
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: json as T };
  const error = (json as { error?: unknown } | null)?.error;
  return { ok: false, status: res.status, error: typeof error === 'string' ? error : `Lỗi máy chủ (${res.status})` };
}
