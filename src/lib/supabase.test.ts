import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseClient } from './supabase';

describe('createSupabaseClient', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('báo lỗi rõ ràng khi thiếu biến môi trường', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(() => createSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('tạo client khi đủ biến môi trường', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(createSupabaseClient()).toBeDefined();
  });
});
