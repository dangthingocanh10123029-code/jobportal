import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { getUnreadMessageCount } from '@/actions/messages';
import { getUnreadNotificationCount } from '@/actions/notifications';
import { SignOutButton } from './sign-out-button';

type NavLink = [href: string, label: string];

const PUBLIC_LINKS: NavLink[] = [['/', 'Việc làm'], ['/companies', 'Công ty'], ['/guide?category=SALARY', 'Lương'], ['/guide', 'Cẩm nang']];
const ROLE_LINKS: Record<string, NavLink[]> = {
  CANDIDATE: [['/candidate/applications', 'Đơn ứng tuyển'], ['/interviews', 'Lịch phỏng vấn'], ['/candidate/profile', 'Hồ sơ của tôi'], ['/candidate/cv', 'CV online'], ['/candidate/saved', 'Việc đã lưu'], ['/candidate/alerts', 'Thông báo việc làm']],
  EMPLOYER: [['/employer/dashboard', 'Dashboard'], ['/employer/postings', 'Tin tuyển dụng'], ['/employer/talent', 'Tìm ứng viên'], ['/employer/billing', 'Gói dịch vụ'], ['/interviews', 'Lịch phỏng vấn'], ['/employer/company', 'Hồ sơ công ty']],
  ADMIN: [['/admin', 'Quản trị']],
};
const ADMIN_MOBILE_LINKS: NavLink[] = [['/admin/users', 'Người dùng'], ['/admin/postings', 'Tin tuyển dụng'], ['/admin/companies', 'Công ty'], ['/admin/audit', 'Nhật ký thao tác'], ['/admin/articles', 'Cẩm nang']];
const GUEST_LINKS: NavLink[] = [['/signup', 'Nhà tuyển dụng']];

const links = (items: NavLink[]) => items.map(([href, label]) => <Link href={href} key={href}>{label}</Link>);

export async function SiteHeader() {
  const [profile, unreadCount, unreadMessages] = await Promise.all([getCurrentProfile(), getUnreadNotificationCount(), getUnreadMessageCount()]);
  const canMessage = profile?.role === 'CANDIDATE' || profile?.role === 'EMPLOYER';
  const roleLinks = profile ? ROLE_LINKS[profile.role] ?? [] : GUEST_LINKS;
  const canPost = !profile || profile.role === 'EMPLOYER';

  return (
    <header className={`site-header${profile ? ' has-wide-nav' : ''}`}>
      <div className="site-header-inner">
        <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark" />
          <span aria-hidden="true" className="brand-name">Job Portal</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="main-nav">
          {links(PUBLIC_LINKS)}
          {links(roleLinks)}
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Mở menu"><span aria-hidden="true" className="mobile-menu-icon">☰</span><span className="mobile-menu-label">Menu</span></summary>
          <nav aria-label="Điều hướng di động" className="mobile-menu-panel">
            {links(PUBLIC_LINKS)}
            {links(roleLinks)}
            {profile?.role === 'ADMIN' ? links(ADMIN_MOBILE_LINKS) : null}
            {canPost ? <Link href="/employer/postings/new">Đăng tin</Link> : null}
            {canMessage ? <Link href="/messages">Tin nhắn ({unreadMessages})</Link> : null}
            {profile ? <Link href="/notifications">Thông báo ({unreadCount})</Link> : <><Link href="/login">Đăng nhập</Link><Link href="/signup">Tạo tài khoản</Link></>}
          </nav>
        </details>
        <div className="site-header-end">
          {profile ? (
            <>
              {canMessage ? (
                <Link aria-label={`Tin nhắn, ${unreadMessages} chưa đọc`} className="notification-bell" href="/messages">
                  <svg aria-hidden="true" fill="none" height="21" viewBox="0 0 24 24" width="21">
                    <path d="M21 12a8 8 0 0 1-11.8 7L4 20.5l1.5-4.7A8 8 0 1 1 21 12Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                  {unreadMessages > 0 ? <span className="notification-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span> : null}
                </Link>
              ) : null}
              <Link aria-label={`Thông báo, ${unreadCount} chưa đọc`} className="notification-bell" href="/notifications">
                <svg aria-hidden="true" fill="none" height="21" viewBox="0 0 24 24" width="21">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
                {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
              </Link>
              <Link className="profile-link" href="/account">Tài khoản</Link>
              {canPost ? <Link className="button button-dark button-small header-post-link" href="/employer/postings/new">Đăng tin</Link> : null}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">Đăng nhập</Link>
              <Link className="button button-primary button-small" href="/signup">Tạo tài khoản</Link>
              <Link className="button button-dark button-small header-post-link" href="/employer/postings/new">Đăng tin</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
