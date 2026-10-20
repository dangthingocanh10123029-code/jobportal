import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { getUnreadMessageCount } from '@/actions/messages';
import { getUnreadNotificationCount } from '@/actions/notifications';
import { SignOutButton } from './sign-out-button';
import { Bell, Briefcase, CircleUser, LogIn, Menu, MessageSquare, Plus, UserPlus } from 'lucide-react';
import { icon, iconLg } from '@/components/ui/primitives';

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
          <span aria-hidden="true" className="brand-mark"><Briefcase {...icon} /></span>
          <span aria-hidden="true" className="brand-name">Job Portal</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="main-nav">
          {links(PUBLIC_LINKS)}
          {links(roleLinks)}
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Mở menu"><Menu {...icon} className="mobile-menu-icon" size={18} /><span className="mobile-menu-label">Menu</span></summary>
          <nav aria-label="Điều hướng di động" className="mobile-menu-panel">
            {links(PUBLIC_LINKS)}
            {links(roleLinks)}
            {profile?.role === 'ADMIN' ? links(ADMIN_MOBILE_LINKS) : null}
            {canPost ? <Link href="/employer/postings/new"><Plus {...icon} />Đăng tin</Link> : null}
            {canMessage ? <Link href="/messages"><MessageSquare {...icon} />Tin nhắn ({unreadMessages})</Link> : null}
            {profile ? <><Link href="/notifications"><Bell {...icon} />Thông báo ({unreadCount})</Link><Link href="/account"><CircleUser {...icon} />Tài khoản</Link></> : <><Link href="/login"><LogIn {...icon} />Đăng nhập</Link><Link href="/signup"><UserPlus {...icon} />Tạo tài khoản</Link></>}
          </nav>
        </details>
        <div className="site-header-end">
          {profile ? (
            <>
              {canMessage ? (
                <Link aria-label={`Tin nhắn, ${unreadMessages} chưa đọc`} className="notification-bell" href="/messages">
                  <MessageSquare {...iconLg} />
                  {unreadMessages > 0 ? <span className="notification-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span> : null}
                </Link>
              ) : null}
              <Link aria-label={`Thông báo, ${unreadCount} chưa đọc`} className="notification-bell" href="/notifications">
                <Bell {...iconLg} />
                {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
              </Link>
              <Link className="profile-link" href="/account" title="Tài khoản"><CircleUser {...iconLg} /><span className="profile-link-label">Tài khoản</span></Link>
              {canPost ? <Link className="button button-primary button-small header-post-link" href="/employer/postings/new"><Plus {...icon} />Đăng tin</Link> : null}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">Đăng nhập</Link>
              <Link className="button button-quiet button-small header-post-link" href="/employer/postings/new">Đăng tin</Link>
              <Link className="button button-primary button-small" href="/signup">Tạo tài khoản</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
