import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { getUnreadNotificationCount } from '@/actions/notifications';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const [profile, unreadCount] = await Promise.all([getCurrentProfile(), getUnreadNotificationCount()]);

  return (
    <header className={`site-header${profile?.role === 'CANDIDATE' || profile?.role === 'EMPLOYER' ? ' has-wide-nav' : ''}`}>
      <div className="site-header-inner">
        <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
          <img alt="Job Portal" className="brand-logo" height="32" src="/images/logo.svg" width="176" />
        </Link>
        <nav aria-label="Điều hướng chính" className="main-nav">
          <Link href="/">Tìm việc</Link>
          <Link href="/companies">Công ty</Link>
          <Link href="/guide">Cẩm nang</Link>
          {profile?.role === 'CANDIDATE' ? <><Link href="/candidate/applications">Đơn ứng tuyển</Link><Link href="/interviews">Lịch phỏng vấn</Link><Link href="/candidate/profile">Hồ sơ của tôi</Link><Link href="/candidate/saved">Việc đã lưu</Link></> : null}
          {profile?.role === 'EMPLOYER' ? <><Link href="/employer/dashboard">Dashboard</Link><Link href="/employer/postings">Tin tuyển dụng</Link><Link href="/interviews">Lịch phỏng vấn</Link><Link href="/employer/company">Hồ sơ công ty</Link></> : null}
          {profile?.role === 'ADMIN' ? <Link href="/admin">Quản trị</Link> : null}
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Mở menu"><span aria-hidden="true" className="mobile-menu-icon">☰</span><span className="mobile-menu-label">Menu</span></summary>
          <nav aria-label="Điều hướng di động" className="mobile-menu-panel">
            <Link href="/">Tìm việc</Link>
            <Link href="/companies">Công ty</Link>
            <Link href="/guide">Cẩm nang</Link>
            {profile?.role === 'CANDIDATE' ? <><Link href="/candidate/applications">Đơn ứng tuyển</Link><Link href="/interviews">Lịch phỏng vấn</Link><Link href="/candidate/profile">Hồ sơ của tôi</Link><Link href="/candidate/saved">Việc đã lưu</Link></> : null}
            {profile?.role === 'EMPLOYER' ? <><Link href="/employer/dashboard">Dashboard</Link><Link href="/employer/postings">Tin tuyển dụng</Link><Link href="/interviews">Lịch phỏng vấn</Link><Link href="/employer/company">Hồ sơ công ty</Link></> : null}
            {profile?.role === 'ADMIN' ? <><Link href="/admin">Quản trị</Link><Link href="/admin/users">Người dùng</Link><Link href="/admin/postings">Tin tuyển dụng</Link><Link href="/admin/companies">Công ty</Link><Link href="/admin/audit">Nhật ký thao tác</Link><Link href="/admin/articles">Cẩm nang</Link></> : null}
            {profile ? <Link href="/notifications">Thông báo ({unreadCount})</Link> : <><Link href="/login">Đăng nhập</Link><Link href="/signup">Tạo tài khoản</Link></>}
          </nav>
        </details>
        <div className="site-header-end">
          {profile ? (
            <>
              <Link aria-label={`Thông báo, ${unreadCount} chưa đọc`} className="notification-bell" href="/notifications">
                <svg aria-hidden="true" fill="none" height="21" viewBox="0 0 24 24" width="21">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
                {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
              </Link>
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
