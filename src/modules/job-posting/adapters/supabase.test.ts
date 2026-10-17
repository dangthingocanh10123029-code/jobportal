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

describe('SupabaseJobPostingRepository.listOpen — query', () => {
  it('skill được gấp dấu và quote thành mảng 1 phần tử; salary_desc để null cuối, hòa thì mới nhất trước', async () => {
    let params = new URLSearchParams();
    const repo = new SupabaseJobPostingRepository(
      createClient('https://example.supabase.co', 'anon-key', {
        global: {
          fetch: async (input) => {
            params = new URL(String(input)).searchParams;
            return new Response('[]', { status: 200, headers: { 'content-range': '*/0' } });
          },
        },
      }),
    );
    await repo.listOpen({ skill: 'Kế "toán", C#', sort: 'salary_desc' }, { offset: 0, limit: 20 });
    expect(params.get('search_skills')).toBe('cs.{"ke \\"toan\\", c#"}');
    expect(params.get('order')).toBe('salary_max.desc.nullslast,created_at.desc,id.asc');
  });
});
