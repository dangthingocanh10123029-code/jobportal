import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentActor } from '@/lib/supabase-server';
import { middleware } from './middleware';

vi.mock('@/lib/supabase-server', () => ({ getCurrentActor: vi.fn() }));

describe('middleware', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('lỗi khi đọc actor → coi như khách, không làm sập request', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.mocked(getCurrentActor).mockRejectedValue(new Error('Không đọc được profile'));

    const guarded = await middleware(new NextRequest('http://localhost/account'));
    expect(guarded.headers.get('location')).toBe('http://localhost/login?next=%2Faccount');
    const open = await middleware(new NextRequest('http://localhost/'));
    expect(open.status).toBe(200);
  });
});
