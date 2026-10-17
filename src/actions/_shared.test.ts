import { describe, expect, it, vi } from 'vitest';
import { fromPartial } from '@total-typescript/shoehorn';
import { createSupabaseServerClient, getCurrentActor } from '@/lib/supabase-server';
import { requireCandidate, requireEmployer, requireSignedIn } from './_shared';

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn(), getCurrentActor: vi.fn() }));

const supabase = fromPartial<Awaited<ReturnType<typeof createSupabaseServerClient>>>({});
vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);

describe('requireSignedIn / requireEmployer / requireCandidate', () => {
  it('chưa đăng nhập → null cho cả ba', async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    expect([await requireSignedIn(), await requireEmployer(), await requireCandidate()]).toEqual([null, null, null]);
  });

  it('Employer: signed-in + employer có id, candidate null', async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: 'u1', role: 'EMPLOYER' });
    expect(await requireSignedIn()).toEqual({ supabase, userId: 'u1' });
    expect(await requireEmployer()).toEqual({ supabase, employerId: 'u1' });
    expect(await requireCandidate()).toBeNull();
  });

  it('Candidate: candidate có id, employer null', async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: 'u2', role: 'CANDIDATE' });
    expect(await requireCandidate()).toEqual({ supabase, candidateId: 'u2' });
    expect(await requireEmployer()).toBeNull();
  });
});
