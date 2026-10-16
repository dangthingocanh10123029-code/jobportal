import Link from 'next/link';
import { getCurrentProfile } from '@/actions/auth';
import { ProfileForm } from '@/components/auth/profile-form';

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="page-shell narrow-shell">
        <section className="surface-card empty-account">
          <span className="eyebrow">Tài khoản</span>
          <h1>Vui lòng đăng nhập</h1>
          <p>Đăng nhập để xem và cập nhật hồ sơ của bạn.</p>
          <Link className="button button-primary" href="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  const displayName = profile.role === 'EMPLOYER' ? profile.companyName : profile.fullName;
  return (
    <main className="page-shell narrow-shell">
      <div className="page-heading">
        <span className="eyebrow">Hồ sơ của bạn</span>
        <h1>Thông tin tài khoản</h1>
        <p>Cập nhật thông tin để hồ sơ luôn sẵn sàng cho cơ hội tiếp theo.</p>
      </div>
      <section className="surface-card account-card">
        <div className="account-summary">
          <div aria-hidden="true" className="avatar-mark">{(displayName?.[0] ?? profile.userId[0] ?? 'J').toLocaleUpperCase('vi')}</div>
          <div>
            <p className="account-name">{displayName || 'Thành viên Job Portal'}</p>
            <span className="role-badge">{profile.role === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}</span>
          </div>
        </div>
        <div className="card-divider" />
        <p className="account-section-title">Thông tin hồ sơ</p>
        <ProfileForm profile={profile} />
      </section>
    </main>
  );
}
