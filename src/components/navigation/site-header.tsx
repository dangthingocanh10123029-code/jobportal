import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
          <img alt="Job Portal" className="brand-logo" height="32" src="/images/logo.svg" width="176" />
        </Link>
        <nav aria-label="Điều hướng chính" className="main-nav">
          <Link href="/">Tìm việc</Link>
          <Link href="/companies">Công ty</Link>
          {profile?.role === 'CANDIDATE' ? <Link href="/candidate/applications">Đơn ứng tuyển</Link> : null}
          {profile?.role === 'EMPLOYER' ? <><Link href="/employer/postings">Tin tuyển dụng</Link><Link href="/employer/company">Hồ sơ công ty</Link></> : null}
        </nav>
        <div className="site-header-end">
          {profile ? (
            <>
              <Link className="profile-link" href="/account">Tài khoản</Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">Đăng nhập</Link>
              <Link className="button button-primary button-small" href="/signup">Tạo tài khoản</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
