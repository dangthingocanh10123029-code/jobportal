import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { SupabaseJobPostingRepository } from './supabase';

// What PostgREST answers for a page past the end, and for the follow-up count.
const fakeFetch: typeof fetch = async (_url, init) =>
  init?.method === 'HEAD'
    ? new Response(null, { status: 200, headers: { 'content-range': '*/45' } })
    : new Response(JSON.stringify({ code: 'PGRST103', message: 'Requested range not satisfiable', details: null, hint: null }), {
        status: 416,
      });

describe('SupabaseJobPostingRepository.listOpen', () => {
  it('trang vượt quá cuối → rows rỗng, total vẫn đúng, không lỗi', async () => {
    const repo = new SupabaseJobPostingRepository(
      createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fakeFetch } }),
    );
    await expect(repo.listOpen({}, { offset: 980, limit: 20 })).resolves.toEqual({ rows: [], total: 45 });
  });
});
