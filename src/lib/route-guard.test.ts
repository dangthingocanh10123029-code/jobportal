import { describe, expect, it } from 'vitest';
import { routeGuard } from './route-guard';

describe('routeGuard', () => {
  it('cho mọi người vào trang công khai', () => {
    expect(routeGuard('/', null)).toBeNull();
    expect(routeGuard('/jobs/123', 'EMPLOYER')).toBeNull();
  });

  it('chuyển về /login kèm next khi chưa đăng nhập vào trang cần đăng nhập', () => {
    expect(routeGuard('/employer/postings', null)).toBe('/login?next=%2Femployer%2Fpostings');
    expect(routeGuard('/candidate/applications', null)).toBe('/login?next=%2Fcandidate%2Fapplications');
    expect(routeGuard('/account', null)).toBe('/login?next=%2Faccount');
  });

  it('chặn Candidate vào /employer/* và Employer vào /candidate/*', () => {
    expect(routeGuard('/employer/postings/new', 'CANDIDATE')).toBe('/');
    expect(routeGuard('/candidate/applications/1', 'EMPLOYER')).toBe('/');
  });

  it('cho đúng vai trò vào trang của mình', () => {
    expect(routeGuard('/employer/postings', 'EMPLOYER')).toBeNull();
    expect(routeGuard('/candidate/applications', 'CANDIDATE')).toBeNull();
    expect(routeGuard('/account', 'CANDIDATE')).toBeNull();
  });

  it('chỉ ADMIN vào /admin/*', () => {
    expect(routeGuard('/admin', null)).toBe('/login?next=%2Fadmin');
    expect(routeGuard('/admin/users/1', 'CANDIDATE')).toBe('/');
    expect(routeGuard('/admin/audit', 'EMPLOYER')).toBe('/');
    expect(routeGuard('/admin/users', 'ADMIN')).toBeNull();
    expect(routeGuard('/employer/postings', 'ADMIN')).toBe('/');
    expect(routeGuard('/administrator', 'CANDIDATE')).toBeNull();
  });

  it('không nhầm tiền tố giống nhau', () => {
    expect(routeGuard('/employers', 'CANDIDATE')).toBeNull();
    expect(routeGuard('/accounting', null)).toBeNull();
  });

  it('đưa người đã đăng nhập ra khỏi /login, /signup', () => {
    expect(routeGuard('/login', 'CANDIDATE')).toBe('/');
    expect(routeGuard('/signup', 'EMPLOYER')).toBe('/');
    expect(routeGuard('/login', null)).toBeNull();
  });
});
