import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { getUnreadMessageCount } from '@/actions/messages';
import { getUnreadNotificationCount } from '@/actions/notifications';
import { avatarFor } from '@/components/avatar';
import { SignOutButton } from './sign-out-button';
import { HeaderMenu, NavLinks, type NavLink } from './header-nav';
import { Bell, Briefcase, ChevronDown, FileText, Menu, MessageSquare, Plus, UserPlus } from 'lucide-react';
import { icon, iconLg } from '@/components/ui/primitives';

const JOBS: NavLink = ['/', 'Việc làm'];
const COMPANIES: NavLink = ['/companies', 'Công ty'];
const SALARY: NavLink = ['/guide?category=SALARY', 'Lương'];
const GUIDE: NavLink = ['/guide', 'Cẩm nang'];
const INTERVIEWS: NavLink = ['/interviews', 'Lịch phỏng vấn'];

/** Per role: at most 5 links in the bar, the rest in the account menu, and the pill CTA. */
const ROLES: Record<string, { main: NavLink[]; more: NavLink[]; cta?: { href: string; label: string; Icon: typeof Plus } }> = {
  GUEST: { main: [JOBS, COMPANIES, SALARY, GUIDE, ['/signup', 'Nhà tuyển dụng']], more: [], cta: { href: '/signup', label: 'Tạo tài khoản', Icon: UserPlus } },
  CANDIDATE: {
    main: [JOBS, ['/candidate/applications', 'Đơn ứng tuyển'], INTERVIEWS, ['/candidate/cv', 'CV online'], GUIDE],
    more: [['/candidate/profile', 'Hồ sơ của tôi'], ['/candidate/saved', 'Việc đã lưu'], ['/candidate/alerts', 'Thông báo việc làm'], COMPANIES, SALARY],
    cta: { href: '/candidate/cv', label: 'Tạo CV', Icon: FileText },
  },
  EMPLOYER: {
    main: [['/employer/dashboard', 'Dashboard'], ['/employer/postings', 'Tin tuyển dụng'], ['/employer/talent', 'Tìm ứng viên'], INTERVIEWS, ['/employer/billing', 'Gói dịch vụ']],
    more: [['/employer/company', 'Hồ sơ công ty'], JOBS, COMPANIES, GUIDE],
    cta: { href: '/employer/postings/new', label: 'Đăng tin', Icon: Plus },
  },
  ADMIN: {
    main: [JOBS, COMPANIES, GUIDE, ['/admin', 'Quản trị']],
    more: [['/admin/users', 'Người dùng'], ['/admin/postings', 'Tin tuyển dụng'], ['/admin/companies', 'Công ty'], ['/admin/audit', 'Nhật ký thao tác'], ['/admin/articles', 'Cẩm nang']],
  },
};

export async function SiteHeader() {
  const [profile, unreadCount, unreadMessages] = await Promise.all([getCurrentProfile(), getUnreadNotificationCount(), getUnreadMessageCount()]);
  const canMessage = profile?.role === 'CANDIDATE' || profile?.role === 'EMPLOYER';
  const { main, more, cta } = ROLES[profile?.role ?? 'GUEST'] ?? { main: [JOBS, COMPANIES, GUIDE], more: [] };

  return (
    <header className="site-header">
      <Link aria-label="Job Portal, trang chủ" className="brand" href="/">
        <span aria-hidden="true" className="brand-mark"><Briefcase {...icon} /></span>
        <span aria-hidden="true" className="brand-name">Job Portal</span>
      </Link>
      <nav aria-label="Điều hướng chính" className="main-nav"><NavLinks items={main} /></nav>
      <div className="site-header-end">
        {profile ? (
          <>
            {canMessage ? (
              <Link aria-label={`Tin nhắn, ${unreadMessages} chưa đọc`} className="notification-bell header-messages" href="/messages">
                <MessageSquare {...iconLg} />
                {unreadMessages > 0 ? <span className="notification-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span> : null}
              </Link>
            ) : null}
            <Link aria-label={`Thông báo, ${unreadCount} chưa đọc`} className="notification-bell" href="/notifications">
              <Bell {...iconLg} />
              {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
            </Link>
            <HeaderMenu
              className="account-menu"
              label="Menu tài khoản"
              summary={<><img alt="" className="account-avatar" height="32" src={avatarFor(profile.userId)} width="32" /><ChevronDown {...icon} className="account-chevron" /></>}
            >
              <div className="header-menu-panel">
                <p className="account-menu-name">{profile.fullName || profile.companyName || 'Tài khoản của tôi'}</p>
                <Link href="/account">Tài khoản</Link>
                <NavLinks items={more} />
                <SignOutButton />
              </div>
            </HeaderMenu>
          </>
        ) : <Link className="login-link" href="/login">Đăng nhập</Link>}
        {cta ? <Link aria-label={cta.label} className="header-cta" href={cta.href}><cta.Icon {...icon} className="header-cta-icon" /><span className="header-cta-label">{cta.label}</span></Link> : null}
        <HeaderMenu className="mobile-menu" label="Mở menu" summary={<Menu {...icon} size={18} />}>
          <nav aria-label="Điều hướng di động" className="header-menu-panel">
            <NavLinks items={main} />
            <NavLinks items={more} />
            {canMessage ? <Link href="/messages">Tin nhắn ({unreadMessages})</Link> : null}
            {profile ? <Link href="/account">Tài khoản</Link> : <Link href="/login">Đăng nhập</Link>}
          </nav>
        </HeaderMenu>
      </div>
    </header>
  );
}
